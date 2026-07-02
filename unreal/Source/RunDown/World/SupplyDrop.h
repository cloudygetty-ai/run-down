#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Components/WeaponComponent.h"
#include "SupplyDrop.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSupplyDropLanded, FVector, LandLocation);

// Supply Drop — high-value loot crate that falls from the sky at a broadcast location.
// Spawned by GameMode::SpawnSupplyDrop() and lands after a configurable fall time.
UCLASS()
class RUNDOWN_API ASupplyDrop : public AActor
{
	GENERATED_BODY()

public:
	ASupplyDrop();

	virtual void Tick(float DeltaTime) override;

	// Collect contents — called by RunDownCharacter::Interact()
	UFUNCTION(BlueprintCallable, Category="World")
	bool Collect(ACharacter* Collector);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Supply")
	float FallSpeed = 500.f; // cm/s

	// High-end weapon granted on collect
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Supply")
	FWeaponData ContainedWeapon;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Supply")
	int32 MaterialBonus = 200;

	UPROPERTY(BlueprintAssignable)
	FOnSupplyDropLanded OnLanded;

protected:
	virtual void BeginPlay() override;

private:
	bool  bLanded    = false;
	bool  bCollected = false;
	float GroundZ    = 0.f;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> MeshComp;

	void FindGroundZ();
};
