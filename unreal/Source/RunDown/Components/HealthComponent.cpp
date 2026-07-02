#include "Components/HealthComponent.h"
#include "Characters/RunDownCharacter.h"

UHealthComponent::UHealthComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UHealthComponent::BeginPlay()
{
	Super::BeginPlay();
	Health = MaxHealth;
}

void UHealthComponent::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickShieldRegen(DeltaTime);
	TickCorruption(DeltaTime);
}

// ── Shield regeneration ──────────────────────────────────────────────────────
// Mirrors TypeScript: after 4s with no damage taken, shield refills at 20/s.

void UHealthComponent::TickShieldRegen(float DeltaTime)
{
	if (Shield >= MaxShield || !IsAlive()) return;

	if (ShieldRegenTimer > 0.f)
	{
		ShieldRegenTimer -= DeltaTime;
		return;
	}

	Shield = FMath::Min(MaxShield, Shield + ShieldRegenRate * DeltaTime);
}

// ── Corruption drain ─────────────────────────────────────────────────────────
// Holding a Fracture Core drains HP at CorruptionDPS per second, floored at 1 HP.

void UHealthComponent::TickCorruption(float DeltaTime)
{
	if (CorruptionDPS <= 0.f || !IsAlive()) return;

	const float Drain = CorruptionDPS * DeltaTime;
	Health = FMath::Max(1.f, Health - Drain);
	OnHealthChanged.Broadcast(Health, MaxHealth);
}

// ── Take damage ──────────────────────────────────────────────────────────────

float UHealthComponent::TakeDamage(float RawDamage, AActor* DamageInstigator)
{
	if (!IsAlive()) return 0.f;

	const float Resisted = RawDamage * (1.f - FMath::Clamp(DamageResistance, 0.f, 1.f));
	float Remaining = Resisted;

	// Shield absorbs first
	if (Shield > 0.f)
	{
		const float ShieldAbs = FMath::Min(Shield, Remaining);
		Shield    -= ShieldAbs;
		Remaining -= ShieldAbs;
	}

	// Any overflow goes to health
	if (Remaining > 0.f)
	{
		Health = FMath::Max(0.f, Health - Remaining);
	}

	// Reset shield regen timer on any damage
	ShieldRegenTimer = ShieldRegenDelaySec;

	OnDamageTaken.Broadcast(Resisted, DamageInstigator);
	OnHealthChanged.Broadcast(Health, MaxHealth);

	if (Health <= 0.f)
	{
		HandleDeath();
	}

	return Resisted;
}

void UHealthComponent::HandleDeath()
{
	if (!bIsKnocked)
	{
		bIsKnocked = true;
		OnKnocked.Broadcast();
	}
	else
	{
		OnEliminated.Broadcast();
	}
}

void UHealthComponent::Heal(float Amount)
{
	Health = FMath::Min(MaxHealth, Health + Amount);
	OnHealthChanged.Broadcast(Health, MaxHealth);
}

void UHealthComponent::SetMaxHealth(float NewMax) { MaxHealth = NewMax; Health = NewMax; }
void UHealthComponent::SetMaxShield(float NewMax) { MaxShield = NewMax; }
void UHealthComponent::SetShield(float Amount)    { Shield = FMath::Clamp(Amount, 0.f, MaxShield); }
void UHealthComponent::SetDamageResistance(float R) { DamageResistance = FMath::Clamp(R, 0.f, 1.f); }
void UHealthComponent::SetKillHealAmount(float A) { KillHealAmount = A; }
void UHealthComponent::SetCorruptionDPS(float DPS) { CorruptionDPS = DPS; }
