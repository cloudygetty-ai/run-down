#include "Characters/RunDownCharacter.h"

#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Net/UnrealNetwork.h"

#include "Characters/CharacterDataAsset.h"
#include "Components/HealthComponent.h"
#include "Components/AbilityComponent.h"
#include "Components/BuildingComponent.h"
#include "Components/WeaponComponent.h"
#include "Core/RunDownGameMode.h"
#include "World/LootDropActor.h"
#include "World/HelixRelay.h"
#include "World/SupplyDrop.h"

ARunDownCharacter::ARunDownCharacter()
{
	PrimaryActorTick.bCanEverTick = true;
	bReplicates = true;

	// ── Over-the-shoulder camera rig ────────────────────────────────────────
	// Matches the SpringArm + Camera hierarchy from the design doc.
	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength         = DefaultArmLength;
	CameraBoom->bUsePawnControlRotation = true;   // arm rotates with mouse/stick
	CameraBoom->bDoCollisionTest        = true;   // arm contracts into walls
	CameraBoom->ProbeChannel            = ECC_Camera;
	CameraBoom->SocketOffset            = FVector(0.f, ShoulderOffsetY, ShoulderOffsetZ);

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false; // camera stays at arm end

	// ── Components ────────────────────────────────────────────────────────
	HealthComp   = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComp"));
	AbilityComp  = CreateDefaultSubobject<UAbilityComponent>(TEXT("AbilityComp"));
	BuildingComp = CreateDefaultSubobject<UBuildingComponent>(TEXT("BuildingComp"));
	WeaponComp   = CreateDefaultSubobject<UWeaponComponent>(TEXT("WeaponComp"));

	// Character always faces camera forward — rotate body, not controller
	bUseControllerRotationYaw = false;
	GetCharacterMovement()->bOrientRotationToMovement        = true;
	GetCharacterMovement()->RotationRate                     = FRotator(0.f, 500.f, 0.f);
	GetCharacterMovement()->JumpZVelocity                    = 600.f;
	GetCharacterMovement()->AirControl                       = 0.3f;
	GetCharacterMovement()->MaxWalkSpeed                     = 500.f;
	GetCharacterMovement()->MinAnalogWalkSpeed               = 20.f;
	GetCharacterMovement()->BrakingDecelerationWalking       = 2000.f;

	// Init lerp tracking
	CurrentShoulderY = ShoulderOffsetY;
	TargetShoulderY  = ShoulderOffsetY;
	CurrentArmLength = DefaultArmLength;
	TargetArmLength  = DefaultArmLength;
}

void ARunDownCharacter::BeginPlay()
{
	Super::BeginPlay();

	// Bind Enhanced Input mapping context
	if (APlayerController* PC = Cast<APlayerController>(Controller))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Sub =
			ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			Sub->AddMappingContext(DefaultMappingContext, 0);
		}
	}

	ApplyOperativePassive();
}

void ARunDownCharacter::ApplyOperativePassive()
{
	if (!OperativeData) return;

	const FCharacterPassive& P = OperativeData->Passive;

	HealthComp->SetMaxHealth(100.f + P.MaxHealthBonus);
	HealthComp->SetMaxShield(100.f + P.MaxShieldBonus);
	HealthComp->SetShield(P.StartingShield);
	HealthComp->SetDamageResistance(P.DamageResistance);
	HealthComp->SetKillHealAmount(P.KillHealAmount);

	GetCharacterMovement()->MaxWalkSpeed *= P.SpeedMultiplier;

	WeaponComp->SetDamageMultiplier(P.DamageMultiplier);
	WeaponComp->SetReloadMultiplier(P.ReloadMultiplier);

	Materials.Wood  += P.MaterialsBonus;
	Materials.Stone += P.MaterialsBonus;
	Materials.Metal += P.MaterialsBonus;
}

void ARunDownCharacter::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	UpdateCameraOffset(DeltaTime);
}

// ── Camera shoulder-swap & ADS lerp ─────────────────────────────────────────
// WHY: lerp rather than snap so the camera glides smoothly between states —
// matches The Division's fluid over-the-shoulder feel.

void ARunDownCharacter::UpdateCameraOffset(float DeltaTime)
{
	CurrentShoulderY = FMath::FInterpTo(CurrentShoulderY, TargetShoulderY, DeltaTime, ShoulderSwapSpeed);
	CurrentArmLength = FMath::FInterpTo(CurrentArmLength, TargetArmLength,  DeltaTime, ShoulderSwapSpeed);

	FVector Offset = CameraBoom->SocketOffset;
	Offset.Y = CurrentShoulderY;
	CameraBoom->SocketOffset  = Offset;
	CameraBoom->TargetArmLength = CurrentArmLength;
}

void ARunDownCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
	Super::SetupPlayerInputComponent(Input);

	if (UEnhancedInputComponent* EI = Cast<UEnhancedInputComponent>(Input))
	{
		EI->BindAction(MoveAction,         ETriggerEvent::Triggered, this, &ARunDownCharacter::Move);
		EI->BindAction(LookAction,         ETriggerEvent::Triggered, this, &ARunDownCharacter::Look);
		EI->BindAction(JumpAction,         ETriggerEvent::Started,   this, &ACharacter::Jump);
		EI->BindAction(JumpAction,         ETriggerEvent::Completed, this, &ACharacter::StopJumping);
		EI->BindAction(FireAction,         ETriggerEvent::Started,   this, &ARunDownCharacter::StartFire);
		EI->BindAction(FireAction,         ETriggerEvent::Completed, this, &ARunDownCharacter::StopFire);
		EI->BindAction(ADSAction,          ETriggerEvent::Started,   this, &ARunDownCharacter::StartADS);
		EI->BindAction(ADSAction,          ETriggerEvent::Completed, this, &ARunDownCharacter::StopADS);
		EI->BindAction(ReloadAction,       ETriggerEvent::Started,   this, &ARunDownCharacter::RequestReload);
		EI->BindAction(AbilityAction,      ETriggerEvent::Started,   this, &ARunDownCharacter::ActivateAbility);
		EI->BindAction(SwapShoulderAction, ETriggerEvent::Started,   this, &ARunDownCharacter::SwapShoulder);
		EI->BindAction(BuildToggleAction,  ETriggerEvent::Started,   this, &ARunDownCharacter::ToggleBuild);
		EI->BindAction(InteractAction,     ETriggerEvent::Started,   this, &ARunDownCharacter::Interact);
		EI->BindAction(PingAction,         ETriggerEvent::Started,   this, &ARunDownCharacter::TriggerPing);
	}
}

void ARunDownCharacter::Move(const FInputActionValue& Value)
{
	if (Status != EPlayerStatus::Alive) return;

	const FVector2D Dir = Value.Get<FVector2D>();
	if (Controller && Dir != FVector2D::ZeroVector)
	{
		// Forward is the controller's yaw direction, right is perpendicular
		const FRotator Yaw(0.f, Controller->GetControlRotation().Yaw, 0.f);
		AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::X), Dir.Y);
		AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y), Dir.X);
	}
}

void ARunDownCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Delta = Value.Get<FVector2D>();
	AddControllerYawInput(Delta.X);
	AddControllerPitchInput(Delta.Y);
}

void ARunDownCharacter::StartADS()
{
	bIsAiming        = true;
	TargetArmLength  = ADSArmLength;
	// Tighten the shoulder offset inward while aiming for a tighter OTS frame
	TargetShoulderY  = bIsRightShoulder ? ShoulderOffsetY * 0.7f : -ShoulderOffsetY * 0.7f;
	// Orient body to camera when aiming
	bUseControllerRotationYaw              = true;
	GetCharacterMovement()->bOrientRotationToMovement = false;
}

void ARunDownCharacter::StopADS()
{
	bIsAiming        = false;
	TargetArmLength  = DefaultArmLength;
	TargetShoulderY  = bIsRightShoulder ? ShoulderOffsetY : -ShoulderOffsetY;
	bUseControllerRotationYaw              = false;
	GetCharacterMovement()->bOrientRotationToMovement = true;
}

void ARunDownCharacter::SwapShoulder()
{
	bIsRightShoulder = !bIsRightShoulder;
	const float Mul  = bIsAiming ? 0.7f : 1.f;
	TargetShoulderY  = bIsRightShoulder ? ShoulderOffsetY * Mul : -ShoulderOffsetY * Mul;
}

void ARunDownCharacter::StartFire()
{
	if (WeaponComp) WeaponComp->StartFiring();
}

void ARunDownCharacter::StopFire()
{
	if (WeaponComp) WeaponComp->StopFiring();
}

void ARunDownCharacter::RequestReload()
{
	if (WeaponComp) WeaponComp->RequestReload();
}

void ARunDownCharacter::ActivateAbility()
{
	if (AbilityComp) AbilityComp->TryActivate();
}

void ARunDownCharacter::ToggleBuild()
{
	if (BuildingComp) BuildingComp->ToggleBuildMode();
}

void ARunDownCharacter::Interact()
{
	// Trace forward for loot / relay / supply drop pickups
	FHitResult Hit;
	const FVector Start = FollowCamera->GetComponentLocation();
	const FVector End   = Start + FollowCamera->GetForwardVector() * 200.f;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	if (!GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params)) return;
	AActor* Target = Hit.GetActor();
	if (!Target) return;

	if (ALootDropActor* Loot = Cast<ALootDropActor>(Target)) { Loot->Collect(this); return; }
	if (AHelixRelay*    Relay = Cast<AHelixRelay>(Target))   { Relay->TryActivate(this); return; }
	if (ASupplyDrop*    Drop  = Cast<ASupplyDrop>(Target))   { Drop->Collect(this); return; }
}

FString ARunDownCharacter::GetOperativeName() const
{
	return OperativeData ? OperativeData->OperativeName : TEXT("Unknown");
}

void ARunDownCharacter::SetOperativeData(UCharacterDataAsset* Data)
{
	OperativeData = Data;
	if (AbilityComp && Data) AbilityComp->Initialize(Data);
	ApplyOperativePassive();
}

void ARunDownCharacter::TriggerPing()
{
	// Broadcast a ping to teammates — GameMode relays to HUD
	if (ARunDownGameMode* GM = GetWorld()->GetAuthGameMode<ARunDownGameMode>())
	{
		GM->BroadcastPing(this);
	}
}

void ARunDownCharacter::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(ARunDownCharacter, Status);
	DOREPLIFETIME(ARunDownCharacter, Kills);
	DOREPLIFETIME(ARunDownCharacter, DamageDealt);
}
