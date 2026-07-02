#include "World/HelixRelay.h"
#include "Core/RunDownGameState.h"
#include "Kismet/GameplayStatics.h"

AHelixRelay::AHelixRelay()
{
	PrimaryActorTick.bCanEverTick = true;

	MeshComp = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = MeshComp;
}

void AHelixRelay::BeginPlay()
{
	Super::BeginPlay();
}

void AHelixRelay::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (!bCapturing || bActivated) return;

	CaptureTimer += DeltaTime;
	if (CaptureTimer >= CaptureTimeSec)
	{
		bActivated  = true;
		bCapturing  = false;

		if (ACharacter* Player = CapturingPlayer.Get())
		{
			OnRelayActivated.Broadcast(Player, RelayId);

			// Notify game state so bombardment triggers
			if (ARunDownGameState* GS = GetWorld()->GetGameState<ARunDownGameState>())
			{
				GS->TriggerBombardment();
			}
		}

		SetActorTickEnabled(false);
	}
}

bool AHelixRelay::TryActivate(ACharacter* Activator)
{
	if (bActivated || bCapturing) return false;

	bCapturing      = true;
	CaptureTimer    = 0.f;
	CapturingPlayer = Activator;
	return true;
}
