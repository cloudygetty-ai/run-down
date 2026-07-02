#include "World/FractureCore.h"
#include "Characters/RunDownCharacter.h"
#include "Components/HealthComponent.h"
#include "EngineUtils.h"

AFractureCore::AFractureCore()
{
	PrimaryActorTick.bCanEverTick = true;

	MeshComp = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = MeshComp;
}

void AFractureCore::BeginPlay()
{
	Super::BeginPlay();
	PulseTimer = PulseIntervalSec;
}

void AFractureCore::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	PulseTimer -= DeltaTime;
	if (PulseTimer <= 0.f)
	{
		PulseTimer = PulseIntervalSec;
		ApplyRandomEffect();
	}
}

void AFractureCore::TriggerBombardment()
{
	SpawnBombardmentImpacts();
}

// ── Private ───────────────────────────────────────────────────────────────────

void AFractureCore::ApplyRandomEffect()
{
	// Pick a random non-None effect
	const int32 EffectIdx = FMath::RandRange(1, 3);
	const EFractureCoreEffect Effect = static_cast<EFractureCoreEffect>(EffectIdx);

	OnPulse.Broadcast(Effect);

	// Apply the effect to all living characters — Blueprint or derived actors handle the visual
	for (TActorIterator<ARunDownCharacter> It(GetWorld()); It; ++It)
	{
		ARunDownCharacter* C = *It;
		if (!C || C->GetStatus() != EPlayerStatus::Alive) continue;

		switch (Effect)
		{
		case EFractureCoreEffect::DamageAmp:
			C->WeaponComp->SetDamageMultiplier(C->WeaponComp->GetDamageMultiplier() * 1.25f);
			break;
		case EFractureCoreEffect::CooldownReduction:
			// Ability component exposes no direct cooldown setter — Blueprint should listen to OnPulse
			break;
		case EFractureCoreEffect::AbilityMutation:
			// Trigger ability immediately on affected character (random mutation)
			C->AbilityComp->TryActivate();
			break;
		default: break;
		}
	}
}

void AFractureCore::SpawnBombardmentImpacts()
{
	const FVector Origin = GetActorLocation();

	for (int32 i = 0; i < BombardmentCount; ++i)
	{
		const FVector2D RandPt = FMath::RandPointInCircle(BombardmentRadius);
		const FVector   ImpactLoc = Origin + FVector(RandPt.X, RandPt.Y, 0.f);

		// Damage any character within 300 cm of the impact
		for (TActorIterator<ARunDownCharacter> It(GetWorld()); It; ++It)
		{
			ARunDownCharacter* C = *It;
			if (!C || C->GetStatus() != EPlayerStatus::Alive) continue;

			if (FVector::Dist(C->GetActorLocation(), ImpactLoc) < 300.f)
			{
				C->HealthComp->TakeDamage(BombardmentDamage, nullptr);
			}
		}
	}
}
