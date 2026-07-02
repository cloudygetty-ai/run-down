#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Components/WeaponComponent.h"
#include "Core/RunDownTypes.h"
#include "LootDropActor.generated.h"

UENUM(BlueprintType)
enum class ELootTier : uint8
{
	Common,
	Rare,
	Epic,
	Legendary
};

// Spawnable pickup that grants a weapon or materials on interact.
UCLASS()
class RUNDOWN_API ALootDropActor : public AActor
{
	GENERATED_BODY()

public:
	ALootDropActor();

	// Collect the loot — called by RunDownCharacter::Interact()
	UFUNCTION(BlueprintCallable, Category="Loot")
	bool Collect(ACharacter* Collector);

	UFUNCTION(BlueprintPure, Category="Loot")
	bool IsCollected() const { return bCollected; }

	// ── Config (set procedurally at spawn or in BP defaults) ─────────────────

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Loot")
	ELootTier Tier = ELootTier::Common;

	// If set, grants this weapon instead of materials
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Loot")
	FWeaponData WeaponPayload;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Loot")
	bool bIsWeapon = false;

	// Material payload when bIsWeapon is false
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Loot")
	int32 MaterialAmount = 50;

protected:
	virtual void BeginPlay() override;

private:
	bool bCollected = false;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> MeshComp;
};
