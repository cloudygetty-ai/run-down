#include "Components/AbilityComponent.h"
#include "Characters/RunDownCharacter.h"
#include "Characters/CharacterDataAsset.h"
#include "Components/HealthComponent.h"
#include "Components/WeaponComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/KismetMathLibrary.h"

UAbilityComponent::UAbilityComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UAbilityComponent::Initialize(UCharacterDataAsset* Data)
{
	OperativeData     = Data;
	CooldownSec       = Data->Ability.CooldownSec;
	DurationSec       = Data->Ability.DurationSec;
	EffectType        = Data->Ability.EffectType;
	CooldownRemaining = 0.f;
}

void UAbilityComponent::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (CooldownRemaining > 0.f)
	{
		CooldownRemaining = FMath::Max(0.f, CooldownRemaining - DeltaTime);
		OnCooldownTick.Broadcast(CooldownRemaining);
	}

	if (ActiveRemaining > 0.f)
	{
		ActiveRemaining -= DeltaTime;
		if (ActiveRemaining <= 0.f)
		{
			ActiveRemaining = 0.f;
			RemoveEffect();
			OnExpired.Broadcast();
		}
	}
}

bool UAbilityComponent::TryActivate()
{
	if (!IsReady() || IsActive()) return false;

	CooldownRemaining = CooldownSec;
	if (DurationSec > 0.f)
	{
		ActiveRemaining = DurationSec;
	}

	ApplyEffect();
	OnActivated.Broadcast();
	return true;
}

// ── Apply / remove effect by type ─────────────────────────────────────────────

void UAbilityComponent::ApplyEffect()
{
	if (!OperativeData) return;

	// Dispatch to operative-specific logic first
	const FString& Id = OperativeData->OperativeId;
	if      (Id == "vex")   ExecutePhaseSkip();
	else if (Id == "brutus") ExecuteTitanGuard();
	else if (Id == "voss")   ExecuteBioSurge();
	else if (Id == "orin")   ExecuteJunkFortress();
	else if (Id == "jax")    ExecuteAdrenalOverride();

	// Apply generic stat effects driven by EffectType
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return;

	switch (EffectType)
	{
	case EAbilityEffectType::DamageImmunity:
		Owner->HealthComp->SetDamageResistance(1.f);
		break;
	case EAbilityEffectType::SpeedBoost:
		Owner->GetCharacterMovement()->MaxWalkSpeed *= 2.f;
		break;
	case EAbilityEffectType::RapidFire:
		// WeaponComponent checks this flag directly
		Owner->WeaponComp->SetRapidFireActive(true);
		break;
	case EAbilityEffectType::DamageBoost:
		Owner->WeaponComp->SetDamageMultiplier(Owner->WeaponComp->GetDamageMultiplier() * 1.5f);
		break;
	default: break;
	}
}

void UAbilityComponent::RemoveEffect()
{
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner || !OperativeData) return;

	// Restore passive baseline from data asset
	const FCharacterPassive& P = OperativeData->Passive;

	switch (EffectType)
	{
	case EAbilityEffectType::DamageImmunity:
		Owner->HealthComp->SetDamageResistance(P.DamageResistance);
		break;
	case EAbilityEffectType::SpeedBoost:
		Owner->GetCharacterMovement()->MaxWalkSpeed = 500.f * P.SpeedMultiplier;
		break;
	case EAbilityEffectType::RapidFire:
		Owner->WeaponComp->SetRapidFireActive(false);
		break;
	case EAbilityEffectType::DamageBoost:
		Owner->WeaponComp->SetDamageMultiplier(P.DamageMultiplier);
		break;
	default: break;
	}
}

// ── Operative-specific ability implementations ────────────────────────────────

void UAbilityComponent::ExecutePhaseSkip()
{
	// Vex: teleport forward 250 cm and spawn a decoy echo at origin
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return;

	const FVector Forward    = Owner->GetActorForwardVector();
	const FVector OriginLoc  = Owner->GetActorLocation();
	const FVector TargetLoc  = OriginLoc + Forward * 250.f;

	// Validate teleport destination
	FHitResult Hit;
	if (!GetWorld()->LineTraceSingleByChannel(Hit, OriginLoc, TargetLoc, ECC_WorldStatic))
	{
		Owner->SetActorLocation(TargetLoc, true);
	}
	else
	{
		Owner->SetActorLocation(Hit.ImpactPoint - Forward * 30.f, true);
	}

	// Spawn decoy echo actor at origin (Blueprint class set in GD_Vex data asset)
	if (OperativeData->CharacterClass.IsValid())
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		GetWorld()->SpawnActor<AActor>(OperativeData->CharacterClass.Get(), OriginLoc,
			Owner->GetActorRotation(), Params);
	}
}

void UAbilityComponent::ExecuteTitanGuard()
{
	// Brutus: handled entirely by DamageImmunity effect type above.
	// Blueprint should trigger shield VFX.
}

void UAbilityComponent::ExecuteBioSurge()
{
	// Voss: instant 80 HP heal
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (Owner && Owner->HealthComp)
	{
		Owner->HealthComp->Heal(80.f);
	}
}

void UAbilityComponent::ExecuteJunkFortress()
{
	// Orin: grant +100 of every building material
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return;

	Owner->Materials.Wood  = FMath::Min(999, Owner->Materials.Wood  + 100);
	Owner->Materials.Stone = FMath::Min(999, Owner->Materials.Stone + 100);
	Owner->Materials.Metal = FMath::Min(999, Owner->Materials.Metal + 100);
}

void UAbilityComponent::ExecuteAdrenalOverride()
{
	// Jax: double speed + rapid fire, drain 5 HP/s during active window
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return;

	Owner->GetCharacterMovement()->MaxWalkSpeed *= 2.f;
	Owner->WeaponComp->SetRapidFireActive(true);

	// 5 HP/s corruption-style drain for the ability duration
	Owner->HealthComp->SetCorruptionDPS(5.f);
}
