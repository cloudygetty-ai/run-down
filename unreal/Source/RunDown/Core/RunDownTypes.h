#pragma once

#include "CoreMinimal.h"
#include "RunDownTypes.generated.h"

// ── Match phase ────────────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EMatchPhase : uint8
{
	Lobby       UMETA(DisplayName = "Lobby"),
	Dropping    UMETA(DisplayName = "Dropping"),
	Playing     UMETA(DisplayName = "Playing"),
	GameOver    UMETA(DisplayName = "Game Over"),
};

// ── Player status ──────────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EPlayerStatus : uint8
{
	Alive       UMETA(DisplayName = "Alive"),
	Knocked     UMETA(DisplayName = "Knocked"),
	Eliminated  UMETA(DisplayName = "Eliminated"),
};

// ── Weapon rarity ─────────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EWeaponRarity : uint8
{
	Common      UMETA(DisplayName = "Common"),
	Uncommon    UMETA(DisplayName = "Uncommon"),
	Rare        UMETA(DisplayName = "Rare"),
	Epic        UMETA(DisplayName = "Epic"),
	Legendary   UMETA(DisplayName = "Legendary"),
};

// ── Weapon category ───────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EWeaponType : uint8
{
	Pickaxe         UMETA(DisplayName = "Pickaxe"),
	Pistol          UMETA(DisplayName = "Pistol"),
	Revolver        UMETA(DisplayName = "Revolver"),
	HandCannon      UMETA(DisplayName = "Hand Cannon"),
	BurstPistol     UMETA(DisplayName = "Burst Pistol"),
	SMG             UMETA(DisplayName = "SMG"),
	CompactSMG      UMETA(DisplayName = "Compact SMG"),
	SuppressedSMG   UMETA(DisplayName = "Suppressed SMG"),
	AssaultRifle    UMETA(DisplayName = "Assault Rifle"),
	BurstAR         UMETA(DisplayName = "Burst AR"),
	HeavyAR         UMETA(DisplayName = "Heavy AR"),
	ThermalAR       UMETA(DisplayName = "Thermal AR"),
	Shotgun         UMETA(DisplayName = "Shotgun"),
	TacticalShotgun UMETA(DisplayName = "Tactical Shotgun"),
	HeavyShotgun    UMETA(DisplayName = "Heavy Shotgun"),
	DrumShotgun     UMETA(DisplayName = "Drum Shotgun"),
	Sniper          UMETA(DisplayName = "Sniper Rifle"),
	SemiSniper      UMETA(DisplayName = "Semi-Auto Sniper"),
	HeavySniper     UMETA(DisplayName = "Heavy Sniper"),
	HuntingRifle    UMETA(DisplayName = "Hunting Rifle"),
	MarksmanRifle   UMETA(DisplayName = "Marksman Rifle"),
	LMG             UMETA(DisplayName = "LMG"),
	RocketLauncher  UMETA(DisplayName = "Rocket Launcher"),
	Crossbow        UMETA(DisplayName = "Crossbow"),
	Minigun         UMETA(DisplayName = "Minigun"),
	RailGun         UMETA(DisplayName = "Rail Gun"),
};

// ── Ability effect type ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EAbilityEffectType : uint8
{
	None            UMETA(DisplayName = "None"),
	DamageImmunity  UMETA(DisplayName = "Damage Immunity"),
	SpeedBoost      UMETA(DisplayName = "Speed Boost"),
	RapidFire       UMETA(DisplayName = "Rapid Fire"),
	DamageBoost     UMETA(DisplayName = "Damage Boost"),
};

// ── Building material ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EBuildMaterial : uint8
{
	Wood    UMETA(DisplayName = "Timber"),
	Stone   UMETA(DisplayName = "Alloy"),
	Metal   UMETA(DisplayName = "Nano"),
};

// ── Fracture Core effect ──────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EFractureCoreEffect : uint8
{
	None                UMETA(DisplayName = "None"),
	DamageAmp           UMETA(DisplayName = "Damage Amplifier"),
	CooldownReduction   UMETA(DisplayName = "Cooldown Reduction"),
	AbilityMutation     UMETA(DisplayName = "Ability Mutation"),
};

// ── Kill feed entry ───────────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct FKillFeedEntry
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly) FString Id;
	UPROPERTY(BlueprintReadOnly) FString KillerName;
	UPROPERTY(BlueprintReadOnly) FString VictimName;
	UPROPERTY(BlueprintReadOnly) float   TimestampSec = 0.f;
};

// ── Materials inventory ────────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct FMaterialInventory
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Wood  = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Stone = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Metal = 0;
};
