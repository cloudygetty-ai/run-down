#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "Core/RunDownTypes.h"
#include "RunDownGameMode.generated.h"

class ARunDownCharacter;
class UCharacterDataAsset;

// Drives match phases: Lobby → Dropping → Playing → GameOver
// Manages SIGIL bombardment, alive-count, bounty system, supply drops.
UCLASS()
class RUNDOWN_API ARunDownGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ARunDownGameMode();

	virtual void BeginPlay()              override;
	virtual void Tick(float DeltaTime)    override;
	virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

	// ── Match control ────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void StartMatch();

	UFUNCTION(BlueprintCallable, Category="Match")
	void EndMatch(ARunDownCharacter* Winner);

	// Called by HealthComponent when a character is eliminated
	UFUNCTION(BlueprintCallable, Category="Match")
	void OnPlayerEliminated(ARunDownCharacter* Victim, ARunDownCharacter* Killer);

	// ── Ping system ──────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Communication")
	void BroadcastPing(ARunDownCharacter* Instigator);

	// ── Config ───────────────────────────────────────────────────────────────

	// All 15 operative data assets — set in BP_GameMode
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Operatives")
	TArray<TObjectPtr<UCharacterDataAsset>> OperativeDataAssets;

	// Bot class to spawn for NPC operatives
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Operatives")
	TSubclassOf<ARunDownCharacter> BotClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Match")
	int32 TotalPlayers = 100;

	// Time (s) before the first supply drop
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Match")
	float FirstSupplyDropDelaySec = 180.f;

	// Kills required to earn the Bounty marker
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Match")
	int32 BountyKillThreshold = 3;

private:
	int32 AliveCount       = 0;
	float SupplyDropTimer  = 0.f;
	float BombardmentTimer = 0.f;

	void SpawnBots();
	void AssignRandomOperative(ARunDownCharacter* Character);
	void TickSupplyDrop(float DeltaTime);
	void TickBombardment(float DeltaTime);
	void UpdateBounty();
	void SpawnSupplyDrop();
};
