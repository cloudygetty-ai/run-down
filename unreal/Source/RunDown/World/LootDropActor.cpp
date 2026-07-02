#include "World/LootDropActor.h"
#include "Characters/RunDownCharacter.h"
#include "Components/WeaponComponent.h"

ALootDropActor::ALootDropActor()
{
	PrimaryActorTick.bCanEverTick = false;

	MeshComp = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = MeshComp;
	MeshComp->SetCollisionProfileName(TEXT("BlockAll"));
}

void ALootDropActor::BeginPlay()
{
	Super::BeginPlay();
}

bool ALootDropActor::Collect(ACharacter* Collector)
{
	if (bCollected) return false;

	ARunDownCharacter* Player = Cast<ARunDownCharacter>(Collector);
	if (!Player) return false;

	if (bIsWeapon && Player->WeaponComp)
	{
		// Find first empty slot
		for (int32 i = 0; i < UWeaponComponent::WeaponSlotCount; ++i)
		{
			if (!Player->WeaponComp->HasWeaponInSlot(i))
			{
				Player->WeaponComp->EquipWeaponInSlot(WeaponPayload, i);
				break;
			}
		}
	}
	else
	{
		// Grant materials split evenly across types
		const int32 Each = MaterialAmount / 3;
		Player->Materials.Wood  = FMath::Min(999, Player->Materials.Wood  + Each);
		Player->Materials.Stone = FMath::Min(999, Player->Materials.Stone + Each);
		Player->Materials.Metal = FMath::Min(999, Player->Materials.Metal + (MaterialAmount - Each * 2));
	}

	bCollected = true;
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	SetLifeSpan(2.f); // destroy after brief delay so effects can play

	return true;
}
