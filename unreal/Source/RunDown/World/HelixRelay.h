#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HelixRelay.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnRelayActivated, AActor*, Activator, FString, RelayId);

// Helix Relay — a capture point scattered across the map.
// Activating one triggers the Fracture Core sigil bombardment event.
// Port of the TypeScript HelixRelay mechanic.
UCLASS()
class RUNDOWN_API AHelixRelay : public AActor
{
	GENERATED_BODY()

public:
	AHelixRelay();

	// Called by RunDownCharacter::Interact() when the player touches this relay
	UFUNCTION(BlueprintCallable, Category="World")
	bool TryActivate(ACharacter* Activator);

	UFUNCTION(BlueprintPure, Category="World")
	bool IsActivated() const { return bActivated; }

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	FString RelayId = TEXT("relay_0");

	// Time (s) the player must hold interact to capture
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="World")
	float CaptureTimeSec = 3.f;

	UPROPERTY(BlueprintAssignable)
	FOnRelayActivated OnRelayActivated;

protected:
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;

private:
	bool  bActivated    = false;
	float CaptureTimer  = 0.f;
	bool  bCapturing    = false;
	TWeakObjectPtr<ACharacter> CapturingPlayer;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> MeshComp;
};
