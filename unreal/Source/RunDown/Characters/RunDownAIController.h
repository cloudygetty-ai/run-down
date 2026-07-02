#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "RunDownAIController.generated.h"

class ARunDownCharacter;
class UNavigationSystemV1;

// Bot brain — mirrors the TypeScript BotService priority logic:
//   1. Flee to safe zone  (highest)
//   2. Engage nearest enemy
//   3. Pick up nearby loot
//   4. Wander              (lowest)
UCLASS()
class RUNDOWN_API ARunDownAIController : public AAIController
{
	GENERATED_BODY()

public:
	ARunDownAIController();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void OnPossess(APawn* InPawn) override;

	// How close (cm) before the bot considers itself "near" a target.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AI")
	float AttackRange = 800.f;

	// How close (cm) for automatic loot pickup.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AI")
	float LootPickupRange = 150.f;

	// How often (s) the bot re-evaluates its priority.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AI")
	float DecisionIntervalSec = 0.2f;

	// Strafe cycle duration (s) — bot oscillates left/right while shooting.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AI")
	float StrafeDurationSec = 1.2f;

private:
	TObjectPtr<ARunDownCharacter> BotCharacter;

	float DecisionTimer  = 0.f;
	float StrafeTimer    = 0.f;
	float StrafeDir      = 1.f;   // +1 or -1
	bool  bIsStrafeMode  = false;

	// Wander
	FVector WanderTarget = FVector::ZeroVector;
	float   WanderTimer  = 0.f;

	void RunPriorityTick(float DeltaTime);

	// Priority 1 — move toward shelter center when outside the zone
	bool TryFleeToSafeZone();

	// Priority 2 — chase + shoot nearest alive enemy
	bool TryEngageEnemy(float DeltaTime);

	// Priority 3 — walk to and collect the nearest loot drop
	bool TryPickupLoot();

	// Priority 4 — wander with a timed random destination
	void DoWander(float DeltaTime);

	// Helpers
	ARunDownCharacter* FindNearestEnemy() const;
	AActor*            FindNearestLoot()  const;
	bool               IsInsideSafeZone() const;
	void               SetRandomWanderTarget();
};
