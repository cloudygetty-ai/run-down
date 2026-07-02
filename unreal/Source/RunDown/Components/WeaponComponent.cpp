#include "Components/WeaponComponent.h"
#include "Characters/RunDownCharacter.h"
#include "Components/HealthComponent.h"
#include "Camera/CameraComponent.h"
#include "Kismet/KismetSystemLibrary.h"

UWeaponComponent::UWeaponComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	Slots.SetNum(WeaponSlotCount);
}

void UWeaponComponent::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickFire(DeltaTime);
	TickReload(DeltaTime);
}

// ── Slot management ───────────────────────────────────────────────────────────

bool UWeaponComponent::EquipWeaponInSlot(const FWeaponData& Weapon, int32 Slot)
{
	if (!Slots.IsValidIndex(Slot)) return false;
	Slots[Slot] = Weapon;
	return true;
}

void UWeaponComponent::SwitchToSlot(int32 Slot)
{
	if (Slots.IsValidIndex(Slot) && Slots[Slot].IsSet())
	{
		ActiveSlot = Slot;
	}
}

bool UWeaponComponent::HasWeaponInSlot(int32 Slot) const
{
	return Slots.IsValidIndex(Slot) && Slots[Slot].IsSet();
}

FWeaponData UWeaponComponent::GetActiveWeapon() const
{
	if (HasWeaponInSlot(ActiveSlot)) return Slots[ActiveSlot].GetValue();
	return FWeaponData{};
}

// ── Fire ─────────────────────────────────────────────────────────────────────

void UWeaponComponent::StartFiring() { bIsFiring = true; }
void UWeaponComponent::StopFiring()  { bIsFiring = false; }

void UWeaponComponent::TickFire(float DeltaTime)
{
	if (FireTimer > 0.f)
	{
		FireTimer -= DeltaTime;
		return;
	}

	if (bIsFiring && HasWeaponInSlot(ActiveSlot))
	{
		FWeaponData& W = Slots[ActiveSlot].GetValue();
		if (W.bIsReloading || W.CurrentAmmo <= 0)
		{
			if (W.CurrentAmmo <= 0) RequestReload();
			return;
		}

		FireOnce();
		const float EffectiveRPS = bRapidFire ? W.FireRateRPS * 2.f : W.FireRateRPS;
		FireTimer = 1.f / EffectiveRPS;
	}
}

void UWeaponComponent::FireOnce()
{
	FWeaponData& W = Slots[ActiveSlot].GetValue();
	W.CurrentAmmo--;

	FHitResult Hit;
	if (PerformHitscan(Hit) && Hit.GetActor())
	{
		ARunDownCharacter* Victim = Cast<ARunDownCharacter>(Hit.GetActor());
		if (Victim && Victim->HealthComp)
		{
			const float FinalDamage = W.Damage * DamageMult;
			const float Dealt = Victim->HealthComp->TakeDamage(FinalDamage, GetOwner());
			OnHitConfirmed.Broadcast(Hit.GetActor(), Dealt);
		}
	}

	OnFired.Broadcast(W.CurrentAmmo);
}

bool UWeaponComponent::PerformHitscan(FHitResult& OutHit) const
{
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return false;

	// Fire from the camera center for accuracy (standard third-person shooter convention)
	const FVector Start = Owner->FollowCamera->GetComponentLocation();
	const FVector End   = Start + Owner->FollowCamera->GetForwardVector() *
		GetActiveWeapon().Range;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(Owner);

	return GetWorld()->LineTraceSingleByChannel(OutHit, Start, End, ECC_Pawn, Params);
}

// ── Reload ────────────────────────────────────────────────────────────────────

void UWeaponComponent::RequestReload()
{
	if (!HasWeaponInSlot(ActiveSlot)) return;
	FWeaponData& W = Slots[ActiveSlot].GetValue();

	if (W.bIsReloading || W.CurrentAmmo >= W.MagazineSize) return;
	W.bIsReloading = true;
	ReloadTimer    = W.ReloadTimeSec * ReloadMult;
}

void UWeaponComponent::TickReload(float DeltaTime)
{
	if (!HasWeaponInSlot(ActiveSlot)) return;
	FWeaponData& W = Slots[ActiveSlot].GetValue();
	if (!W.bIsReloading) return;

	ReloadTimer -= DeltaTime;
	if (ReloadTimer <= 0.f)
	{
		W.CurrentAmmo  = W.MagazineSize;
		W.bIsReloading = false;
		ReloadTimer    = 0.f;
		OnReloaded.Broadcast();
	}
}
