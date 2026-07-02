#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/RunDownTypes.h"
#include "BuildingComponent.generated.h"

UENUM(BlueprintType)
enum class EBuildPieceType : uint8
{
	Wall,
	Floor,
	Ramp,
	Roof
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBuildModeChanged, bool, bIsActive);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnStructureBuilt, EBuildPieceType, Piece, FVector, Location);

// Handles building placement and material costs — port of the TypeScript building logic.
// Material currency: Wood / Stone / Metal (Timber / Alloy / Nano in lore).
UCLASS(ClassGroup=RunDown, meta=(BlueprintSpawnableComponent))
class RUNDOWN_API UBuildingComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UBuildingComponent();

	// ── Build mode ───────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Building")
	void ToggleBuildMode();

	UFUNCTION(BlueprintCallable, Category="Building")
	void ExitBuildMode();

	UFUNCTION(BlueprintPure, Category="Building")
	bool IsInBuildMode() const { return bBuildModeActive; }

	// ── Placement ────────────────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category="Building")
	bool TryPlacePiece(EBuildPieceType Piece);

	UFUNCTION(BlueprintCallable, Category="Building")
	void SelectPiece(EBuildPieceType Piece) { SelectedPiece = Piece; }

	UFUNCTION(BlueprintPure, Category="Building")
	EBuildPieceType GetSelectedPiece() const { return SelectedPiece; }

	// ── Material cost ────────────────────────────────────────────────────────

	// Cost per piece per material type (tunable in BP_GameMode or data asset)
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	int32 WallCost  = 10;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	int32 FloorCost = 10;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	int32 RampCost  = 15;

	// Blueprint classes for spawnable structure pieces
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	TSubclassOf<AActor> WallClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	TSubclassOf<AActor> FloorClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Building")
	TSubclassOf<AActor> RampClass;

	UPROPERTY(BlueprintAssignable) FOnBuildModeChanged OnBuildModeChanged;
	UPROPERTY(BlueprintAssignable) FOnStructureBuilt   OnStructureBuilt;

private:
	bool            bBuildModeActive = false;
	EBuildPieceType SelectedPiece    = EBuildPieceType::Wall;

	FVector  GetPlacementLocation() const;
	int32    GetMaterialCost(EBuildPieceType Piece) const;
	TSubclassOf<AActor> GetPieceClass(EBuildPieceType Piece) const;
};
