#include "Core/RunDownGameMode.h"
#include "Core/RunDownGameState.h"
#include "Characters/RunDownCharacter.h"
#include "Characters/CharacterDataAsset.h"
#include "Characters/RunDownAIController.h"
#include "Components/HealthComponent.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/PlayerStart.h"

ARunDownGameMode::ARunDownGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	GameStateClass = ARunDownGameState::StaticClass();
}

void ARunDownGameMode::BeginPlay()
{
	Super::BeginPlay();

	AliveCount = TotalPlayers;

	SpawnBots();

	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (GS) GS->SetMatchPhase(EMatchPhase::Lobby);
}

void ARunDownGameMode::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (!GS || GS->GetMatchPhase() != EMatchPhase::Playing) return;

	TickSupplyDrop(DeltaTime);
	TickBombardment(DeltaTime);
}

AActor* ARunDownGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
	// Pick a random PlayerStart so operatives don't stack on spawn
	TArray<AActor*> Starts;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), APlayerStart::StaticClass(), Starts);
	if (Starts.IsEmpty()) return Super::ChoosePlayerStart_Implementation(Player);
	return Starts[FMath::RandRange(0, Starts.Num() - 1)];
}

// ── Match control ─────────────────────────────────────────────────────────────

void ARunDownGameMode::StartMatch()
{
	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (GS) GS->SetMatchPhase(EMatchPhase::Playing);

	SupplyDropTimer  = FirstSupplyDropDelaySec;
	BombardmentTimer = 60.f;
}

void ARunDownGameMode::EndMatch(ARunDownCharacter* Winner)
{
	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (GS)
	{
		GS->SetMatchPhase(EMatchPhase::GameOver);
		if (Winner) GS->SetWinnerName(Winner->GetOperativeName());
	}
}

void ARunDownGameMode::OnPlayerEliminated(ARunDownCharacter* Victim, ARunDownCharacter* Killer)
{
	if (!Victim) return;

	AliveCount = FMath::Max(0, AliveCount - 1);

	// Record kill feed entry
	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (GS)
	{
		GS->AddKillFeedEntry(
			Killer ? Killer->GetOperativeName() : TEXT("Zone"),
			Victim->GetOperativeName()
		);
		GS->SetAliveCount(AliveCount);
	}

	if (Killer) UpdateBounty();

	if (AliveCount <= 1)
	{
		// Find last surviving character
		ARunDownCharacter* LastAlive = nullptr;
		for (TActorIterator<ARunDownCharacter> It(GetWorld()); It; ++It)
		{
			if ((*It)->GetStatus() == EPlayerStatus::Alive)
			{
				LastAlive = *It;
				break;
			}
		}
		EndMatch(LastAlive);
	}
}

// ── Ping system ───────────────────────────────────────────────────────────────

void ARunDownGameMode::BroadcastPing(ARunDownCharacter* Instigator)
{
	if (!Instigator) return;

	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (GS) GS->AddPingLocation(Instigator->GetActorLocation(), Instigator->GetOperativeName());
}

// ── Private helpers ───────────────────────────────────────────────────────────

void ARunDownGameMode::SpawnBots()
{
	if (!BotClass || OperativeDataAssets.IsEmpty()) return;

	// Count human players already in the world
	int32 HumanCount = 0;
	for (TActorIterator<ARunDownCharacter> It(GetWorld()); It; ++It) ++HumanCount;

	const int32 BotsToSpawn = FMath::Max(0, TotalPlayers - HumanCount);

	TArray<AActor*> Starts;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), APlayerStart::StaticClass(), Starts);

	for (int32 i = 0; i < BotsToSpawn; ++i)
	{
		FVector SpawnLoc = FVector::ZeroVector;
		FRotator SpawnRot = FRotator::ZeroRotator;
		if (!Starts.IsEmpty())
		{
			AActor* Start = Starts[FMath::RandRange(0, Starts.Num() - 1)];
			SpawnLoc = Start->GetActorLocation();
			SpawnRot = Start->GetActorRotation();
		}

		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

		ARunDownCharacter* Bot = GetWorld()->SpawnActor<ARunDownCharacter>(BotClass, SpawnLoc, SpawnRot, Params);
		if (Bot)
		{
			AssignRandomOperative(Bot);

			ARunDownAIController* AICtrl = GetWorld()->SpawnActor<ARunDownAIController>();
			if (AICtrl) AICtrl->Possess(Bot);
		}
	}
}

void ARunDownGameMode::AssignRandomOperative(ARunDownCharacter* Character)
{
	if (!Character || OperativeDataAssets.IsEmpty()) return;
	const int32 Idx = FMath::RandRange(0, OperativeDataAssets.Num() - 1);
	if (OperativeDataAssets[Idx])
	{
		Character->SetOperativeData(OperativeDataAssets[Idx]);
	}
}

void ARunDownGameMode::TickSupplyDrop(float DeltaTime)
{
	SupplyDropTimer -= DeltaTime;
	if (SupplyDropTimer <= 0.f)
	{
		SpawnSupplyDrop();
		SupplyDropTimer = 120.f; // respawn every 2 minutes thereafter
	}
}

void ARunDownGameMode::TickBombardment(float DeltaTime)
{
	BombardmentTimer -= DeltaTime;
	if (BombardmentTimer <= 0.f)
	{
		ARunDownGameState* GS = GetGameState<ARunDownGameState>();
		if (GS) GS->TriggerBombardment();
		BombardmentTimer = 90.f;
	}
}

void ARunDownGameMode::UpdateBounty()
{
	// Find any character who hit the kill threshold and mark them as the bounty target
	for (TActorIterator<ARunDownCharacter> It(GetWorld()); It; ++It)
	{
		ARunDownCharacter* C = *It;
		if (C->GetKills() >= BountyKillThreshold)
		{
			ARunDownGameState* GS = GetGameState<ARunDownGameState>();
			if (GS) GS->SetBountyTarget(C);
			return;
		}
	}
}

void ARunDownGameMode::SpawnSupplyDrop()
{
	ARunDownGameState* GS = GetGameState<ARunDownGameState>();
	if (!GS) return;

	// Random point within the current shelter radius
	const FVector Center = GS->GetShelterCenter();
	const float   Radius = GS->GetShelterRadius() * 0.8f;

	const FVector2D RandCircle = FMath::RandPointInCircle(Radius);
	const FVector   DropLoc    = Center + FVector(RandCircle.X, RandCircle.Y, 2000.f);

	GS->BroadcastSupplyDrop(DropLoc);
}
