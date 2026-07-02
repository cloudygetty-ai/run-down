#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/RunDownTypes.h"
#include "FractureCore.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnFractureCorePulse, EFractureCoreEffect, Effect);

// Fracture Core — the map's central alien energy node.
// Periodically pulses a random EFractureCoreEffect that buffs/debuffs all living players.
// Activating a Helix Relay triggers a sigil bombardment through this actor.
UCLASS()
class RUNDOWN_API AFractureCore : public AActor
{
	GENERATED_BODY()

public:
	AFractureCore();

	virtual void Tick(float DeltaTime) override;

	// Force a bombardment pulse from an external caller (GameMode / HelixRelay)
	UFUNCTION(BlueprintCallable, Category="World")
	void TriggerBombardment();

	// How often the Fracture Core pulses a random effect
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	float PulseIntervalSec = 120.f;

	// Radius of the bombardment zone (cm)
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	float BombardmentRadius = 8000.f;

	// How many sigil impact sites per bombardment
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	int32 BombardmentCount = 5;

	// Damage dealt per sigil impact
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	float BombardmentDamage = 40.f;

	UPROPERTY(BlueprintAssignable)
	FOnFractureCorePulse OnPulse;

protected:
	virtual void BeginPlay() override;

private:
	float PulseTimer = 0.f;

	void ApplyRandomEffect();
	void SpawnBombardmentImpacts();

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> MeshComp;
};
