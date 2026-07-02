#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Core/RunDownTypes.h"
#include "RunDownCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UCharacterDataAsset;
class UHealthComponent;
class UAbilityComponent;
class UBuildingComponent;
class UWeaponComponent;
class UInputMappingContext;
class UInputAction;
struct FInputActionValue;

UCLASS(Abstract, Blueprintable)
class RUNDOWN_API ARunDownCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ARunDownCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(UInputComponent* Input) override;

	// ── Camera ──────────────────────────────────────────────────────────────

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
	TObjectPtr<UCameraComponent> FollowCamera;

	// Lateral camera offset from spine — positive = right shoulder, negative = left.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
	float ShoulderOffsetY = 70.f;

	// Vertical camera offset — puts camera above the shoulder.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
	float ShoulderOffsetZ = 45.f;

	// How fast the camera lerps between shoulders (units/s in socket-offset space).
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
	float ShoulderSwapSpeed = 10.f;

	// Default camera distance from character.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
	float DefaultArmLength = 280.f;

	// Camera distance while aiming down sights.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
	float ADSArmLength = 160.f;

	// ── Components ───────────────────────────────────────────────────────────

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Components")
	TObjectPtr<UHealthComponent> HealthComp;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Components")
	TObjectPtr<UAbilityComponent> AbilityComp;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Components")
	TObjectPtr<UBuildingComponent> BuildingComp;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Components")
	TObjectPtr<UWeaponComponent> WeaponComp;

	// ── Operative data ───────────────────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Operative")
	TObjectPtr<UCharacterDataAsset> OperativeData;

	// ── Status ───────────────────────────────────────────────────────────────

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Status", Replicated)
	EPlayerStatus Status = EPlayerStatus::Alive;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Status", Replicated)
	int32 Kills = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Status", Replicated)
	float DamageDealt = 0.f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Status")
	FMaterialInventory Materials;

	// ── Aim ──────────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Combat")
	void StartADS();

	UFUNCTION(BlueprintCallable, Category="Combat")
	void StopADS();

	UFUNCTION(BlueprintCallable, Category="Combat")
	void SwapShoulder();

	UFUNCTION(BlueprintCallable, Category="Combat")
	bool IsAiming() const { return bIsAiming; }

	// ── Input ────────────────────────────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> FireAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> ADSAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> ReloadAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> AbilityAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> SwapShoulderAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> BuildToggleAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> InteractAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
	TObjectPtr<UInputAction> PingAction;

	// ── Events ───────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintImplementableEvent, Category="Combat")
	void OnKilledEnemy(ARunDownCharacter* Victim);

	UFUNCTION(BlueprintImplementableEvent, Category="Status")
	void OnKnocked();

	UFUNCTION(BlueprintImplementableEvent, Category="Status")
	void OnEliminated();

	// ── Accessors ────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category="Operative")
	FString GetOperativeName() const;

	UFUNCTION(BlueprintPure, Category="Status")
	EPlayerStatus GetStatus() const { return Status; }

	UFUNCTION(BlueprintPure, Category="Status")
	int32 GetKills() const { return Kills; }

	UFUNCTION(BlueprintCallable, Category="Operative")
	void SetOperativeData(UCharacterDataAsset* Data);

	UFUNCTION(BlueprintCallable, Category="World")
	void Interact();

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

protected:
	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartFire();
	void StopFire();
	void RequestReload();
	void ActivateAbility();
	void ToggleBuild();
	void TriggerPing();

private:
	bool  bIsAiming       = false;
	bool  bIsRightShoulder = true;
	float CurrentShoulderY = 0.f;   // tracks lerp state
	float TargetShoulderY  = 0.f;
	float CurrentArmLength = 0.f;
	float TargetArmLength  = 0.f;

	void UpdateCameraOffset(float DeltaTime);
	void ApplyOperativePassive();
};
