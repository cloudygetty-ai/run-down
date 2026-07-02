#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "Core/RunDownTypes.h"
#include "RunDownHUD.generated.h"

class UUserWidget;
class ARunDownCharacter;

// Manages in-world HUD widgets — health bar, kill feed, ping markers, ability cooldown.
// Each panel is a separate UMG widget so Blueprint can theme them independently.
UCLASS()
class RUNDOWN_API ARunDownHUD : public AHUD
{
	GENERATED_BODY()

public:
	ARunDownHUD();

	virtual void BeginPlay() override;
	virtual void DrawHUD() override;

	// Notify HUD of a new kill feed entry (called by GameState delegate)
	UFUNCTION(BlueprintCallable, Category="HUD")
	void PushKillFeedEntry(const FString& KillerName, const FString& VictimName);

	// Show a world-space ping marker for PingDurationSec seconds
	UFUNCTION(BlueprintCallable, Category="HUD")
	void ShowPingMarker(FVector WorldLocation, const FString& InstigatorName);

	// ── Widget classes — set in BP_HUD ───────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="HUD|Widgets")
	TSubclassOf<UUserWidget> MainHUDClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="HUD|Widgets")
	TSubclassOf<UUserWidget> KillFeedWidgetClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="HUD|Widgets")
	TSubclassOf<UUserWidget> PingMarkerWidgetClass;

private:
	UPROPERTY() TObjectPtr<UUserWidget> MainHUDWidget;
	UPROPERTY() TObjectPtr<UUserWidget> KillFeedWidget;

	// Active ping markers: location + expiry time
	struct FPingMarker
	{
		FVector   WorldLoc;
		FString   InstigatorName;
		float     ExpiryTime;
	};
	TArray<FPingMarker> ActivePings;

	float PingDurationSec = 8.f;

	void DrawPingMarkers();
	void BindGameStateEvents();
};
