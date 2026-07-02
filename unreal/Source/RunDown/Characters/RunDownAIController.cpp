#include "Characters/RunDownAIController.h"

#include "Characters/RunDownCharacter.h"
#include "Components/WeaponComponent.h"
#include "Components/AbilityComponent.h"
#include "World/LootDropActor.h"
#include "Core/RunDownGameState.h"
#include "NavigationSystem.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetMathLibrary.h"
#include "DrawDebugHelpers.h"

ARunDownAIController::ARunDownAIController()
{
	PrimaryActorTick.bCanEverTick = true;
}

void ARunDownAIController::BeginPlay()
{
	Super::BeginPlay();
}

void ARunDownAIController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);
	BotCharacter = Cast<ARunDownCharacter>(InPawn);

	// Randomize first wander/decision so 99 bots don't all tick on the same frame
	DecisionTimer = FMath::RandRange(0.f, DecisionIntervalSec);
	SetRandomWanderTarget();
}

void ARunDownAIController::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (!BotCharacter || BotCharacter->Status != EPlayerStatus::Alive) return;

	DecisionTimer -= DeltaTime;
	if (DecisionTimer <= 0.f)
	{
		DecisionTimer = DecisionIntervalSec;
		RunPriorityTick(DeltaTime);
	}
}

void ARunDownAIController::RunPriorityTick(float DeltaTime)
{
	// Priority waterfall — mirrors TypeScript BotService.tickBots()
	if (TryFleeToSafeZone())   return;
	if (TryEngageEnemy(DeltaTime)) return;
	if (TryPickupLoot())        return;
	DoWander(DeltaTime);
}

// ── Priority 1: Safe zone ────────────────────────────────────────────────────

bool ARunDownAIController::TryFleeToSafeZone()
{
	if (IsInsideSafeZone()) return false;

	ARunDownGameState* GS = GetWorld()->GetGameState<ARunDownGameState>();
	if (!GS) return false;

	MoveToLocation(GS->ShelterCenter, 50.f);
	return true;
}

bool ARunDownAIController::IsInsideSafeZone() const
{
	ARunDownGameState* GS = GetWorld()->GetGameState<ARunDownGameState>();
	if (!GS || !BotCharacter) return true;

	const float Dist = FVector::Dist2D(BotCharacter->GetActorLocation(), GS->ShelterCenter);
	return Dist <= GS->ShelterRadius;
}

// ── Priority 2: Engage enemy ─────────────────────────────────────────────────

bool ARunDownAIController::TryEngageEnemy(float DeltaTime)
{
	ARunDownCharacter* Enemy = FindNearestEnemy();
	if (!Enemy) return false;

	const FVector BotLoc   = BotCharacter->GetActorLocation();
	const FVector EnemyLoc = Enemy->GetActorLocation();
	const float   Dist     = FVector::Dist(BotLoc, EnemyLoc);

	// Rotate to face enemy
	SetFocalPoint(EnemyLoc + FVector(0.f, 0.f, 60.f));

	if (Dist > AttackRange)
	{
		// Close the gap
		bIsStrafeMode = false;
		MoveToActor(Enemy, 200.f);
	}
	else
	{
		// In attack range — strafe while shooting
		StrafeTimer -= DecisionIntervalSec;
		if (StrafeTimer <= 0.f)
		{
			StrafeTimer = StrafeDurationSec;
			StrafeDir   = FMath::RandBool() ? 1.f : -1.f;
		}

		const FVector Right = BotCharacter->GetActorRightVector();
		const FVector StrafeTarget = BotLoc + Right * StrafeDir * 200.f;
		MoveToLocation(StrafeTarget, 20.f);

		// Fire weapon
		if (UWeaponComponent* WC = BotCharacter->WeaponComp)
		{
			WC->StartFiring();
			// Stop firing next tick — simulates burst behaviour
		}

		// Opportunistically use ability when health is low or enemy is close
		if (UAbilityComponent* AC = BotCharacter->AbilityComp)
		{
			const bool bLowHealth = (BotCharacter->HealthComp &&
				BotCharacter->HealthComp->GetHealthPercent() < 0.4f);
			if (bLowHealth || Dist < 250.f)
			{
				AC->TryActivate();
			}
		}
	}
	return true;
}

ARunDownCharacter* ARunDownAIController::FindNearestEnemy() const
{
	if (!BotCharacter) return nullptr;

	TArray<AActor*> AllChars;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), ARunDownCharacter::StaticClass(), AllChars);

	ARunDownCharacter* Best = nullptr;
	float BestDist = TNumericLimits<float>::Max();

	for (AActor* Actor : AllChars)
	{
		ARunDownCharacter* Other = Cast<ARunDownCharacter>(Actor);
		if (!Other || Other == BotCharacter) continue;
		if (Other->Status != EPlayerStatus::Alive)  continue;

		const float D = FVector::Dist(BotCharacter->GetActorLocation(), Other->GetActorLocation());
		if (D < BestDist)
		{
			BestDist = D;
			Best     = Other;
		}
	}
	return (BestDist < 2000.f) ? Best : nullptr;
}

// ── Priority 3: Loot pickup ──────────────────────────────────────────────────

bool ARunDownAIController::TryPickupLoot()
{
	AActor* Loot = FindNearestLoot();
	if (!Loot) return false;

	const float Dist = FVector::Dist(BotCharacter->GetActorLocation(), Loot->GetActorLocation());
	if (Dist <= LootPickupRange)
	{
		// Trigger pickup directly
		IInteractable::Execute_Interact(Loot, BotCharacter);
		return true;
	}

	MoveToActor(Loot, LootPickupRange * 0.8f);
	return true;
}

AActor* ARunDownAIController::FindNearestLoot() const
{
	TArray<AActor*> Drops;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), ALootDropActor::StaticClass(), Drops);

	AActor* Best = nullptr;
	float   BestDist = 800.f;  // only care about loot within 800 cm

	for (AActor* A : Drops)
	{
		const float D = FVector::Dist(BotCharacter->GetActorLocation(), A->GetActorLocation());
		if (D < BestDist)
		{
			BestDist = D;
			Best     = A;
		}
	}
	return Best;
}

// ── Priority 4: Wander ───────────────────────────────────────────────────────

void ARunDownAIController::DoWander(float DeltaTime)
{
	WanderTimer -= DeltaTime;

	const float DistToTarget = FVector::Dist2D(
		BotCharacter->GetActorLocation(), WanderTarget);

	if (WanderTimer <= 0.f || DistToTarget < 100.f)
	{
		SetRandomWanderTarget();
	}

	MoveToLocation(WanderTarget, 50.f);
}

void ARunDownAIController::SetRandomWanderTarget()
{
	WanderTimer = FMath::RandRange(2.f, 5.f);

	ARunDownGameState* GS = GetWorld()->GetGameState<ARunDownGameState>();
	const FVector Center  = GS ? GS->ShelterCenter : BotCharacter->GetActorLocation();
	const float   Radius  = GS ? FMath::Min(GS->ShelterRadius * 0.8f, 1200.f) : 600.f;

	// Random point inside shelter, reachable by navmesh
	FNavLocation NavLoc;
	UNavigationSystemV1* NavSys = UNavigationSystemV1::GetCurrent(GetWorld());
	if (NavSys && NavSys->GetRandomReachablePointInRadius(Center, Radius, NavLoc))
	{
		WanderTarget = NavLoc.Location;
	}
	else
	{
		const float Angle = FMath::RandRange(0.f, 2.f * PI);
		WanderTarget = Center + FVector(FMath::Cos(Angle), FMath::Sin(Angle), 0.f) *
			FMath::RandRange(200.f, Radius);
	}
}
