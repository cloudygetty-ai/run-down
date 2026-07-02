#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Core/RunDownTypes.h"
#include "CharacterDataAsset.generated.h"

// Passive stat modifiers — one per operative, applied at spawn.
USTRUCT(BlueprintType)
struct FCharacterPassive
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(MultiLine=true))
	FString Description;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float MaxHealthBonus = 0.f;       // added to base 100 HP

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float MaxShieldBonus = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float StartingShield = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float SpeedMultiplier = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float DamageMultiplier = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin=0.f, ClampMax=1.f))
	float DamageResistance = 0.f;     // fraction of incoming damage blocked

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float ReloadMultiplier = 1.f;     // < 1.0 = faster reload

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float KillHealAmount = 0.f;       // HP restored on elimination

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 MaterialsBonus = 0;         // extra starting units of each material
};

// Per-operative special ability definition.
USTRUCT(BlueprintType)
struct FCharacterAbility
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FString Name;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(MultiLine=true))
	FString Description;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float CooldownSec = 20.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	float DurationSec = 0.f;         // 0 = instant

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	EAbilityEffectType EffectType = EAbilityEffectType::None;
};

// One DataAsset per operative. Create 15 in Content/Characters/.
UCLASS(BlueprintType)
class RUNDOWN_API UCharacterDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity")
	FString OperativeId;             // e.g. "vex"

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity")
	FString OperativeName;           // e.g. 'Vex "Glitch" Calder'

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity")
	FString Title;                   // e.g. "The Phantom"

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity")
	FString HeadgearType;            // e.g. "ECHO VISOR"

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity", meta=(MultiLine=true))
	FString Lore;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Identity", meta=(MultiLine=true))
	FString MeteorQuip;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Visual")
	FLinearColor AccentColor = FLinearColor::White;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Visual")
	TSoftObjectPtr<UTexture2D> Portrait;

	// Skeletal mesh for the operative's 3D body (assign in Content Browser)
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Visual")
	TSoftObjectPtr<USkeletalMesh> CharacterMesh;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Stats")
	FCharacterPassive Passive;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Stats")
	FCharacterAbility Ability;

	// The character class to spawn for this operative (can vary per skin tier).
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Gameplay")
	TSoftClassPtr<AActor> CharacterClass;
};
