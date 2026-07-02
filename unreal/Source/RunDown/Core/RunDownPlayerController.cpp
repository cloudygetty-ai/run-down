#include "Core/RunDownPlayerController.h"
#include "Characters/RunDownCharacter.h"
#include "Core/RunDownGameMode.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"

ARunDownPlayerController::ARunDownPlayerController()
{
	bShowMouseCursor = false;
}

void ARunDownPlayerController::BeginPlay()
{
	Super::BeginPlay();

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
	{
		if (DefaultMappingContext)
		{
			Subsystem->AddMappingContext(DefaultMappingContext, 0);
		}
	}
}

void ARunDownPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent);
	if (!EIC) return;

	EIC->BindAction(IA_Move,         ETriggerEvent::Triggered, this, &ARunDownPlayerController::OnMove);
	EIC->BindAction(IA_Look,         ETriggerEvent::Triggered, this, &ARunDownPlayerController::OnLook);
	EIC->BindAction(IA_Jump,         ETriggerEvent::Started,   this, &ARunDownPlayerController::OnJump);
	EIC->BindAction(IA_Fire,         ETriggerEvent::Started,   this, &ARunDownPlayerController::OnFireStart);
	EIC->BindAction(IA_Fire,         ETriggerEvent::Completed, this, &ARunDownPlayerController::OnFireStop);
	EIC->BindAction(IA_ADS,          ETriggerEvent::Started,   this, &ARunDownPlayerController::OnADSStart);
	EIC->BindAction(IA_ADS,          ETriggerEvent::Completed, this, &ARunDownPlayerController::OnADSStop);
	EIC->BindAction(IA_Reload,       ETriggerEvent::Started,   this, &ARunDownPlayerController::OnReload);
	EIC->BindAction(IA_Ability,      ETriggerEvent::Started,   this, &ARunDownPlayerController::OnAbility);
	EIC->BindAction(IA_Build,        ETriggerEvent::Started,   this, &ARunDownPlayerController::OnBuild);
	EIC->BindAction(IA_Interact,     ETriggerEvent::Started,   this, &ARunDownPlayerController::OnInteract);
	EIC->BindAction(IA_SwapShoulder, ETriggerEvent::Started,   this, &ARunDownPlayerController::OnSwapShoulder);
	EIC->BindAction(IA_Ping,         ETriggerEvent::Started,   this, &ARunDownPlayerController::OnPing);
	EIC->BindAction(IA_Slot1,        ETriggerEvent::Started,   this, &ARunDownPlayerController::OnSlot1);
	EIC->BindAction(IA_Slot2,        ETriggerEvent::Started,   this, &ARunDownPlayerController::OnSlot2);
	EIC->BindAction(IA_Slot3,        ETriggerEvent::Started,   this, &ARunDownPlayerController::OnSlot3);
}

// ── Input handlers ────────────────────────────────────────────────────────────

void ARunDownPlayerController::OnMove(const FInputActionValue& Value)
{
	ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn());
	if (!C) return;

	const FVector2D Axis = Value.Get<FVector2D>();
	const FRotator  ControlRot(0.f, GetControlRotation().Yaw, 0.f);

	C->AddMovementInput(FRotationMatrix(ControlRot).GetUnitAxis(EAxis::X), Axis.Y);
	C->AddMovementInput(FRotationMatrix(ControlRot).GetUnitAxis(EAxis::Y), Axis.X);
}

void ARunDownPlayerController::OnLook(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddYawInput(Axis.X);
	AddPitchInput(Axis.Y);
}

void ARunDownPlayerController::OnJump()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->Jump();
}

void ARunDownPlayerController::OnFireStart()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->StartFiring();
}

void ARunDownPlayerController::OnFireStop()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->StopFiring();
}

void ARunDownPlayerController::OnADSStart()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->StartADS();
}

void ARunDownPlayerController::OnADSStop()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->StopADS();
}

void ARunDownPlayerController::OnReload()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->RequestReload();
}

void ARunDownPlayerController::OnAbility()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->AbilityComp->TryActivate();
}

void ARunDownPlayerController::OnBuild()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->BuildingComp->ToggleBuildMode();
}

void ARunDownPlayerController::OnInteract()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->Interact();
}

void ARunDownPlayerController::OnSwapShoulder()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->SwapShoulder();
}

void ARunDownPlayerController::OnPing()
{
	ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn());
	if (!C) return;

	if (ARunDownGameMode* GM = GetWorld()->GetAuthGameMode<ARunDownGameMode>())
	{
		GM->BroadcastPing(C);
	}
}

void ARunDownPlayerController::OnSlot1()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->SwitchToSlot(0);
}

void ARunDownPlayerController::OnSlot2()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->SwitchToSlot(1);
}

void ARunDownPlayerController::OnSlot3()
{
	if (ARunDownCharacter* C = Cast<ARunDownCharacter>(GetPawn())) C->WeaponComp->SwitchToSlot(2);
}
