#include "Components/BuildingComponent.h"
#include "Characters/RunDownCharacter.h"
#include "Camera/CameraComponent.h"

UBuildingComponent::UBuildingComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

// ── Build mode ────────────────────────────────────────────────────────────────

void UBuildingComponent::ToggleBuildMode()
{
	bBuildModeActive = !bBuildModeActive;
	OnBuildModeChanged.Broadcast(bBuildModeActive);
}

void UBuildingComponent::ExitBuildMode()
{
	if (!bBuildModeActive) return;
	bBuildModeActive = false;
	OnBuildModeChanged.Broadcast(false);
}

// ── Placement ─────────────────────────────────────────────────────────────────

bool UBuildingComponent::TryPlacePiece(EBuildPieceType Piece)
{
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner) return false;

	const int32 Cost = GetMaterialCost(Piece);

	// Spend from the cheapest available material that covers the cost
	FMaterialInventory& Mats = Owner->Materials;
	if (Mats.Wood >= Cost)
	{
		Mats.Wood -= Cost;
	}
	else if (Mats.Stone >= Cost)
	{
		Mats.Stone -= Cost;
	}
	else if (Mats.Metal >= Cost)
	{
		Mats.Metal -= Cost;
	}
	else
	{
		return false; // not enough materials
	}

	const FVector PlaceLoc = GetPlacementLocation();
	TSubclassOf<AActor> PieceClass = GetPieceClass(Piece);

	if (PieceClass)
	{
		FActorSpawnParameters Params;
		Params.Instigator = Owner;
		GetWorld()->SpawnActor<AActor>(PieceClass, PlaceLoc, FRotator::ZeroRotator, Params);
	}

	OnStructureBuilt.Broadcast(Piece, PlaceLoc);
	return true;
}

// ── Private helpers ───────────────────────────────────────────────────────────

FVector UBuildingComponent::GetPlacementLocation() const
{
	ARunDownCharacter* Owner = Cast<ARunDownCharacter>(GetOwner());
	if (!Owner || !Owner->FollowCamera) return FVector::ZeroVector;

	const FVector Start = Owner->FollowCamera->GetComponentLocation();
	const FVector End   = Start + Owner->FollowCamera->GetForwardVector() * 400.f;

	FHitResult Hit;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(Owner);

	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_WorldStatic, Params))
	{
		// Snap to 100-unit grid for clean building
		FVector Loc = Hit.ImpactPoint;
		Loc.X = FMath::RoundToFloat(Loc.X / 100.f) * 100.f;
		Loc.Y = FMath::RoundToFloat(Loc.Y / 100.f) * 100.f;
		Loc.Z = FMath::RoundToFloat(Loc.Z / 100.f) * 100.f;
		return Loc;
	}

	return End;
}

int32 UBuildingComponent::GetMaterialCost(EBuildPieceType Piece) const
{
	switch (Piece)
	{
	case EBuildPieceType::Wall:  return WallCost;
	case EBuildPieceType::Floor: return FloorCost;
	case EBuildPieceType::Ramp:  return RampCost;
	default:                     return WallCost;
	}
}

TSubclassOf<AActor> UBuildingComponent::GetPieceClass(EBuildPieceType Piece) const
{
	switch (Piece)
	{
	case EBuildPieceType::Wall:  return WallClass;
	case EBuildPieceType::Floor: return FloorClass;
	case EBuildPieceType::Ramp:  return RampClass;
	default:                     return WallClass;
	}
}
