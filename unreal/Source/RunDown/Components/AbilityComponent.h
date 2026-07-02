#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/RunDownTypes.h"
#include "AbilityComponent.generated.h"

class UCharacterDataAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnAbilityActivated);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnAbilityExpired);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCooldownTick, float, RemainingCooldownSec);

// Drives the character ability system — cooldown, duration, and per-effect logic.
// All 15 operative abilities map to one of 5 EAbilityEffectType values.
UCLASS(ClassGroup=RunDown, meta=(BlueprintSpawnableComponent))
class RUNDOWN_API UAbilityComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UAbilityComponent();
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// Bind to operative's data asset at spawn
	void Initialize(UCharacterDataAsset* Data);

	// Try to fire — no-ops if on cooldown or inactive status
	UFUNCTION(BlueprintCallable, Category="Ability")
	bool TryActivate();

	UFUNCTION(BlueprintPure, Category="Ability")
	bool IsReady() const { return CooldownRemaining <= 0.f; }

	UFUNCTION(BlueprintPure, Category="Ability")
	bool IsActive() const { return ActiveRemaining > 0.f; }

	UFUNCTION(BlueprintPure, Category="Ability")
	float GetCooldownRemaining() const { return CooldownRemaining; }

	UFUNCTION(BlueprintPure, Category="Ability")
	float GetActiveRemaining() const { return ActiveRemaining; }

	UPROPERTY(BlueprintAssignable) FOnAbilityActivated OnActivated;
	UPROPERTY(BlueprintAssignable) FOnAbilityExpired   OnExpired;
	UPROPERTY(BlueprintAssignable) FOnCooldownTick     OnCooldownTick;

private:
	float CooldownSec      = 20.f;
	float DurationSec      = 0.f;
	float CooldownRemaining = 0.f;
	float ActiveRemaining   = 0.f;
	EAbilityEffectType EffectType = EAbilityEffectType::None;

	TObjectPtr<UCharacterDataAsset> OperativeData;

	void ApplyEffect();
	void RemoveEffect();

	// ── Phase Skip (Vex) ─────────────────────────────────────────────────────
	void ExecutePhaseSkip();
	// ── Titan Guard (Brutus) ─────────────────────────────────────────────────
	void ExecuteTitanGuard();
	// ── Bio Surge (Voss) ─────────────────────────────────────────────────────
	void ExecuteBioSurge();
	// ── Junk Fortress (Orin) ─────────────────────────────────────────────────
	void ExecuteJunkFortress();
	// ── Adrenal Override (Jax) ───────────────────────────────────────────────
	void ExecuteAdrenalOverride();
};
