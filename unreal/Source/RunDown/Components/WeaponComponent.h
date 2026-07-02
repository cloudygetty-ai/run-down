#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/RunDownTypes.h"
#include "WeaponComponent.generated.h"

USTRUCT(BlueprintType)
struct FWeaponData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString         WeaponId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) EWeaponType     Type         = EWeaponType::Pistol;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) EWeaponRarity   Rarity       = EWeaponRarity::Common;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float           Damage       = 25.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float           FireRateRPS  = 4.f;   // rounds per second
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32           MagazineSize = 30;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32           CurrentAmmo  = 30;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float           Range        = 2000.f; // cm
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float           ReloadTimeSec = 2.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) bool            bIsReloading = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWeaponFired, int32, AmmoRemaining);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnReloadComplete);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHitConfirmed, AActor*, HitActor, float, DamageDealt);

// Manages equipped weapons (3 slots), firing, and reloading.
UCLASS(ClassGroup=RunDown, meta=(BlueprintSpawnableComponent))
class RUNDOWN_API UWeaponComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UWeaponComponent();
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Slots ────────────────────────────────────────────────────────────────

	static constexpr int32 WeaponSlotCount = 3;

	UFUNCTION(BlueprintCallable)
	bool EquipWeaponInSlot(const FWeaponData& Weapon, int32 Slot);

	UFUNCTION(BlueprintCallable)
	void SwitchToSlot(int32 Slot);

	UFUNCTION(BlueprintPure)
	int32 GetActiveSlot() const { return ActiveSlot; }

	UFUNCTION(BlueprintPure)
	FWeaponData GetActiveWeapon() const;

	UFUNCTION(BlueprintPure)
	bool HasWeaponInSlot(int32 Slot) const;

	// ── Combat ───────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable)
	void StartFiring();

	UFUNCTION(BlueprintCallable)
	void StopFiring();

	UFUNCTION(BlueprintCallable)
	void RequestReload();

	// ── Modifiers (set by passive + ability system) ───────────────────────────

	void SetDamageMultiplier(float Mult)    { DamageMult = Mult; }
	void SetReloadMultiplier(float Mult)    { ReloadMult = Mult; }
	void SetRapidFireActive(bool bActive)   { bRapidFire = bActive; }
	float GetDamageMultiplier() const       { return DamageMult; }

	UPROPERTY(BlueprintAssignable) FOnWeaponFired   OnFired;
	UPROPERTY(BlueprintAssignable) FOnReloadComplete OnReloaded;
	UPROPERTY(BlueprintAssignable) FOnHitConfirmed  OnHitConfirmed;

private:
	TArray<TOptional<FWeaponData>> Slots;
	int32 ActiveSlot    = 0;
	bool  bIsFiring     = false;
	bool  bRapidFire    = false;
	float DamageMult    = 1.f;
	float ReloadMult    = 1.f;
	float FireTimer     = 0.f;   // time until next shot allowed
	float ReloadTimer   = 0.f;

	void TickFire(float DeltaTime);
	void TickReload(float DeltaTime);
	void FireOnce();
	bool PerformHitscan(FHitResult& OutHit) const;
};
