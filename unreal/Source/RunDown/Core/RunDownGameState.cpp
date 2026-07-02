#include "Core/RunDownGameState.h"
#include "Net/UnrealNetwork.h"

ARunDownGameState::ARunDownGameState()
{
	ShelterCenter = FVector::ZeroVector;
}

void ARunDownGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(ARunDownGameState, MatchPhase);
	DOREPLIFETIME(ARunDownGameState, AliveCount);
	DOREPLIFETIME(ARunDownGameState, ShelterCenter);
	DOREPLIFETIME(ARunDownGameState, ShelterRadius);
	DOREPLIFETIME(ARunDownGameState, WinnerName);
}

void ARunDownGameState::SetMatchPhase(EMatchPhase NewPhase)
{
	MatchPhase = NewPhase;
	OnMatchPhaseChanged.Broadcast(NewPhase);
}

void ARunDownGameState::SetAliveCount(int32 Count)
{
	AliveCount = Count;
}

void ARunDownGameState::SetShelterParams(FVector Center, float Radius)
{
	ShelterCenter = Center;
	ShelterRadius = Radius;
}

void ARunDownGameState::AddKillFeedEntry(const FString& KillerName, const FString& VictimName)
{
	FKillFeedEntry Entry;
	Entry.Id         = KillFeed.Num();
	Entry.KillerName = KillerName;
	Entry.VictimName = VictimName;
	Entry.TimestampSec = GetServerWorldTimeSeconds();

	KillFeed.Add(Entry);

	// Keep only the 20 most recent entries
	if (KillFeed.Num() > 20) KillFeed.RemoveAt(0);
}

void ARunDownGameState::SetBountyTarget(ARunDownCharacter* Target)
{
	BountyTarget = Target;
}

void ARunDownGameState::TriggerBombardment()
{
	OnBombardmentTriggered.Broadcast();
}

void ARunDownGameState::BroadcastSupplyDrop(const FVector& Location)
{
	OnSupplyDropSpawned.Broadcast(Location, NextDropId++);
}

void ARunDownGameState::AddPingLocation(const FVector& Location, const FString& InstigatorName)
{
	OnPingAdded.Broadcast(Location, InstigatorName);
}
