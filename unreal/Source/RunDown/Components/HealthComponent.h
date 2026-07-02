#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnDamageTaken, float, Amount, AActor*, Instigator);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnKnocked);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnEliminated);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHealthChanged, float, NewHealth, float, MaxHealth);

// Manages HP, shield, corruption drain, and shield regen.
// Ported from TypeScript: health/shield bars + corruptionDps + shieldRegenDelayMs
UCLASS(ClassGroup=RunDown, meta=(BlueprintSpawnableComponent))
class RUNDOWN_API UHealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UHealthComponent();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Config ──────────────────────────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Health")
	float MaxHealth = 100.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Health")
	float MaxShield = 100.f;

	// Delay (s) after last damage before shield starts regenerating — mirrors 4s TypeScript value
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Health")
	float ShieldRegenDelaySec = 4.f;

	// Shield regeneration rate (units/s)
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Health")
	float ShieldRegenRate = 20.f;

	// ── Setters ──────────────────────────────────────────────────────────────

	void SetMaxHealth(float NewMax);
	void SetMaxShield(float NewMax);
	void SetShield(float Amount);
	void SetDamageResistance(float Resistance);
	void SetKillHealAmount(float Amount);
	void SetCorruptionDPS(float DPS);

	// ── API ──────────────────────────────────────────────────────────────────

	// Returns actual damage dealt after resistance and shield absorption.
	UFUNCTION(BlueprintCallable, Category="Health")
	float TakeDamage(float RawDamage, AActor* DamageInstigator);

	// Instantly restore HP (clamped to MaxHealth). Used by Bio Surge, kill heal.
	UFUNCTION(BlueprintCallable, Category="Health")
	void Heal(float Amount);

	UFUNCTION(BlueprintPure, Category="Health")
	float GetHealth() const { return Health; }

	UFUNCTION(BlueprintPure, Category="Health")
	float GetShield() const { return Shield; }

	UFUNCTION(BlueprintPure, Category="Health")
	float GetHealthPercent() const { return MaxHealth > 0.f ? Health / MaxHealth : 0.f; }

	UFUNCTION(BlueprintPure, Category="Health")
	bool  IsAlive() const { return Health > 0.f; }

	UFUNCTION(BlueprintPure, Category="Health")
	float GetCorruptionDPS() const { return CorruptionDPS; }

	// ── Delegates ────────────────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable) FOnDamageTaken  OnDamageTaken;
	UPROPERTY(BlueprintAssignable) FOnKnocked      OnKnocked;
	UPROPERTY(BlueprintAssignable) FOnEliminated   OnEliminated;
	UPROPERTY(BlueprintAssignable) FOnHealthChanged OnHealthChanged;

private:
	float Health           = 100.f;
	float Shield           = 0.f;
	float DamageResistance = 0.f;   // 0.0 – 1.0
	float KillHealAmount   = 0.f;
	float CorruptionDPS    = 0.f;
	float ShieldRegenTimer = 0.f;   // counts down to regen

	bool  bIsKnocked = false;

	void TickShieldRegen(float DeltaTime);
	void TickCorruption(float DeltaTime);
	void HandleDeath();
};
