#include "UI/RunDownHUD.h"
#include "Core/RunDownGameState.h"
#include "Blueprint/UserWidget.h"
#include "Engine/Canvas.h"

ARunDownHUD::ARunDownHUD()
{
}

void ARunDownHUD::BeginPlay()
{
	Super::BeginPlay();

	APlayerController* PC = GetOwningPlayerController();
	if (!PC) return;

	if (MainHUDClass)
	{
		MainHUDWidget = CreateWidget<UUserWidget>(PC, MainHUDClass);
		if (MainHUDWidget) MainHUDWidget->AddToViewport();
	}

	if (KillFeedWidgetClass)
	{
		KillFeedWidget = CreateWidget<UUserWidget>(PC, KillFeedWidgetClass);
		if (KillFeedWidget) KillFeedWidget->AddToViewport();
	}

	BindGameStateEvents();
}

void ARunDownHUD::DrawHUD()
{
	Super::DrawHUD();
	DrawPingMarkers();
}

void ARunDownHUD::PushKillFeedEntry(const FString& KillerName, const FString& VictimName)
{
	// Blueprint implementation in WBP_KillFeed handles the scroll animation.
	// This C++ version draws a simple canvas fallback.
	if (!Canvas) return;

	const FString Text = FString::Printf(TEXT("%s  ▶  %s"), *KillerName, *VictimName);
	FCanvasTextItem Item(FVector2D(Canvas->SizeX - 340.f, 120.f), FText::FromString(Text),
		GEngine->GetSmallFont(), FLinearColor(1.f, 0.44f, 0.f)); // SIGIL orange
	Item.Scale = FVector2D(1.2f, 1.2f);
	Canvas->DrawItem(Item);
}

void ARunDownHUD::ShowPingMarker(FVector WorldLocation, const FString& InstigatorName)
{
	ActivePings.Add({ WorldLocation, InstigatorName,
		GetWorld()->GetTimeSeconds() + PingDurationSec });
}

// ── Private ───────────────────────────────────────────────────────────────────

void ARunDownHUD::DrawPingMarkers()
{
	if (!Canvas || !GetOwningPlayerController()) return;

	const float Now = GetWorld()->GetTimeSeconds();
	ActivePings.RemoveAll([Now](const FPingMarker& P) { return P.ExpiryTime <= Now; });

	for (const FPingMarker& Ping : ActivePings)
	{
		FVector2D ScreenPos;
		if (!GetOwningPlayerController()->ProjectWorldLocationToScreen(Ping.WorldLoc, ScreenPos)) continue;

		// Diamond ping icon
		const float Remaining = Ping.ExpiryTime - Now;
		const float Alpha     = FMath::Clamp(Remaining / 2.f, 0.f, 1.f); // fade last 2s

		FCanvasTextItem Item(ScreenPos - FVector2D(8.f, 8.f), FText::FromString(TEXT("◆")),
			GEngine->GetSmallFont(), FLinearColor(1.f, 0.44f, 0.f, Alpha));
		Item.Scale = FVector2D(1.5f, 1.5f);
		Canvas->DrawItem(Item);

		// Instigator label below the icon
		FCanvasTextItem Label(ScreenPos + FVector2D(-20.f, 14.f),
			FText::FromString(Ping.InstigatorName),
			GEngine->GetSmallFont(), FLinearColor(1.f, 1.f, 1.f, Alpha));
		Canvas->DrawItem(Label);
	}
}

void ARunDownHUD::BindGameStateEvents()
{
	ARunDownGameState* GS = GetWorld()->GetGameState<ARunDownGameState>();
	if (!GS) return;

	GS->OnPingAdded.AddDynamic(this, &ARunDownHUD::ShowPingMarker);
}
