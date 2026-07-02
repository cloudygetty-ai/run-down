#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "Core/RunDownTypes.h"
#include "RunDownGameState.generated.h"

class ARunDownCharacter;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMatchPhaseChanged, EMatchPhase, NewPhase);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSupplyDropSpawned, FVector, Location, int32, DropId);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnBombardmentTriggered);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPingAdded, FVector, Location, const FString&, InstigatorName);

// Authoritative match state broadcast to all clients.
UCLASS()
class RUNDOWN_API ARunDownGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	ARunDownGameState();

	// ── Phase ────────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void SetMatchPhase(EMatchPhase NewPhase);

	UFUNCTION(BlueprintPure, Category="Match")
	EMatchPhase GetMatchPhase() const { return MatchPhase; }

	// ── Alive count ──────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void SetAliveCount(int32 Count);

	UFUNCTION(BlueprintPure, Category="Match")
	int32 GetAliveCount() const { return AliveCount; }

	// ── Shelter (safe zone) ──────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Zone")
	void SetShelterParams(FVector Center, float Radius);

	UFUNCTION(BlueprintPure, Category="Zone")
	FVector GetShelterCenter() const { return ShelterCenter; }

	UFUNCTION(BlueprintPure, Category="Zone")
	float GetShelterRadius() const { return ShelterRadius; }

	// ── Kill feed ────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void AddKillFeedEntry(const FString& KillerName, const FString& VictimName);

	UFUNCTION(BlueprintPure, Category="Match")
	const TArray<FKillFeedEntry>& GetKillFeed() const { return KillFeed; }

	// ── Bounty ───────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void SetBountyTarget(ARunDownCharacter* Target);

	UFUNCTION(BlueprintPure, Category="Match")
	ARunDownCharacter* GetBountyTarget() const { return BountyTarget; }

	// ── Winner ───────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Match")
	void SetWinnerName(const FString& Name) { WinnerName = Name; }

	UFUNCTION(BlueprintPure, Category="Match")
	const FString& GetWinnerName() const { return WinnerName; }

	// ── Events ───────────────────────────────────────────────────────────────

	void TriggerBombardment();
	void BroadcastSupplyDrop(const FVector& Location);
	void AddPingLocation(const FVector& Location, const FString& InstigatorName);

	// ── Delegates ────────────────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable) FOnMatchPhaseChanged   OnMatchPhaseChanged;
	UPROPERTY(BlueprintAssignable) FOnSupplyDropSpawned   OnSupplyDropSpawned;
	UPROPERTY(BlueprintAssignable) FOnBombardmentTriggered OnBombardmentTriggered;
	UPROPERTY(BlueprintAssignable) FOnPingAdded           OnPingAdded;

private:
	UPROPERTY(Replicated) EMatchPhase       MatchPhase   = EMatchPhase::Lobby;
	UPROPERTY(Replicated) int32             AliveCount   = 0;
	UPROPERTY(Replicated) FVector           ShelterCenter;
	UPROPERTY(Replicated) float             ShelterRadius = 10000.f;
	UPROPERTY(Replicated) FString           WinnerName;

	UPROPERTY() TArray<FKillFeedEntry>       KillFeed;
	UPROPERTY() TObjectPtr<ARunDownCharacter> BountyTarget;

	int32 NextDropId = 0;

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
};
