#include "World/SupplyDrop.h"
#include "Characters/RunDownCharacter.h"
#include "Components/WeaponComponent.h"

ASupplyDrop::ASupplyDrop()
{
	PrimaryActorTick.bCanEverTick = true;

	MeshComp = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = MeshComp;
}

void ASupplyDrop::BeginPlay()
{
	Super::BeginPlay();
	FindGroundZ();
}

void ASupplyDrop::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (bLanded) return;

	const FVector Loc = GetActorLocation();
	if (Loc.Z <= GroundZ)
	{
		SetActorLocation(FVector(Loc.X, Loc.Y, GroundZ));
		bLanded = true;
		SetActorTickEnabled(false);
		OnLanded.Broadcast(GetActorLocation());
	}
	else
	{
		SetActorLocation(Loc - FVector(0.f, 0.f, FallSpeed * DeltaTime));
	}
}

bool ASupplyDrop::Collect(ACharacter* Collector)
{
	if (!bLanded || bCollected) return false;

	ARunDownCharacter* Player = Cast<ARunDownCharacter>(Collector);
	if (!Player) return false;

	// Grant the high-end weapon in the first open slot
	if (Player->WeaponComp)
	{
		for (int32 i = 0; i < UWeaponComponent::WeaponSlotCount; ++i)
		{
			if (!Player->WeaponComp->HasWeaponInSlot(i))
			{
				Player->WeaponComp->EquipWeaponInSlot(ContainedWeapon, i);
				break;
			}
		}
	}

	// Material bonus
	Player->Materials.Wood  = FMath::Min(999, Player->Materials.Wood  + MaterialBonus / 3);
	Player->Materials.Stone = FMath::Min(999, Player->Materials.Stone + MaterialBonus / 3);
	Player->Materials.Metal = FMath::Min(999, Player->Materials.Metal + MaterialBonus / 3);

	bCollected = true;
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	SetLifeSpan(2.f);
	return true;
}

void ASupplyDrop::FindGroundZ()
{
	const FVector Start = GetActorLocation();
	const FVector End   = Start - FVector(0.f, 0.f, 50000.f);

	FHitResult Hit;
	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_WorldStatic))
	{
		GroundZ = Hit.ImpactPoint.Z;
	}
	else
	{
		GroundZ = 0.f;
	}
}
