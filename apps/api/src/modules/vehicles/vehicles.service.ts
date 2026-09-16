/**
 * plans/11-vehicle-listing-data-model.md §5/§8 — the Vehicle CRUD business
 * logic. Controllers depend only on this service (Plan 05 §5's module
 * template rule).
 */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, type Vehicle as VehicleRow } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type {
  AddVehicleEquipmentRequest,
  CreateVehicleModificationRequest,
  CreateVehicleRequest,
  CurrentUser as CurrentUserType,
  UpdateVehicleRequest,
  Vehicle,
  VehicleEquipmentItem,
  VehicleModificationItem,
} from '@vehicles-marketplace/validation';

@Injectable()
export class VehiclesService {
  /** §10's first acceptance criterion — a confirmed `VehicleLookup` (owned by the caller, §5's own convention borrowed from Plan 10) whose selected derivative is `APPROVED`. */
  async create(currentUser: CurrentUserType, input: CreateVehicleRequest): Promise<Vehicle> {
    const lookup = await this.requireOwnedLookup(input.vehicleLookupId, currentUser.id);

    if (!lookup.selectedDerivativeId) {
      throw new ConflictException(
        'Confirm a derivative for this vehicle lookup before creating a vehicle.',
      );
    }

    const existingVehicle = await db.vehicle.findUnique({ where: { vehicleLookupId: lookup.id } });
    if (existingVehicle) {
      throw new ConflictException('A vehicle has already been created from this lookup.');
    }

    const derivative = await db.derivative.findUnique({
      where: { id: lookup.selectedDerivativeId },
    });
    if (!derivative) throw new NotFoundException('Derivative not found');
    if (derivative.status !== 'APPROVED') {
      throw new ConflictException('Only an approved derivative can be used to create a vehicle.');
    }

    const vehicle = await db.vehicle.create({
      data: {
        id: createId('veh'),
        ownerId: currentUser.id,
        derivativeId: derivative.id,
        vehicleLookupId: lookup.id,
        registration: lookup.registration,
        dvlaTaxStatus: lookup.dvlaTaxStatus,
        dvlaMotStatus: lookup.dvlaMotStatus,
        dvlaMotExpiryDate: lookup.dvlaMotExpiryDate,
        firstRegisteredAt: input.firstRegisteredAt ? new Date(input.firstRegisteredAt) : undefined,
        mileageMiles: input.mileageMiles,
        ownersCount: input.ownersCount,
        colourFamily: input.colourFamily,
        manufacturerColourId: input.manufacturerColourId,
        interiorDescription: input.interiorDescription,
        upholstery: input.upholstery,
        ukSupplied: input.ukSupplied,
        imported: input.imported,
        importCountry: input.importCountry,
        serviceHistoryType: input.serviceHistoryType,
        mainDealerHistory: input.mainDealerHistory,
        serviceRecordsAvailable: input.serviceRecordsAvailable,
        accidentDeclared: input.accidentDeclared,
        writeOffCategory: input.writeOffCategory,
      },
    });

    return this.toVehicle(vehicle, [], []);
  }

  async update(
    currentUser: CurrentUserType,
    vehicleId: string,
    patch: UpdateVehicleRequest,
  ): Promise<Vehicle> {
    await this.requireOwnedVehicle(vehicleId, currentUser);

    const updated = await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        firstRegisteredAt:
          patch.firstRegisteredAt !== undefined ? new Date(patch.firstRegisteredAt) : undefined,
        mileageMiles: patch.mileageMiles,
        ownersCount: patch.ownersCount,
        colourFamily: patch.colourFamily,
        manufacturerColourId: patch.manufacturerColourId,
        interiorDescription: patch.interiorDescription,
        upholstery: patch.upholstery,
        ukSupplied: patch.ukSupplied,
        imported: patch.imported,
        importCountry: patch.importCountry,
        serviceHistoryType: patch.serviceHistoryType,
        mainDealerHistory: patch.mainDealerHistory,
        serviceRecordsAvailable: patch.serviceRecordsAvailable,
        accidentDeclared: patch.accidentDeclared,
        writeOffCategory: patch.writeOffCategory,
      },
    });

    return this.toVehicleWithLinks(updated);
  }

  async addEquipment(
    currentUser: CurrentUserType,
    vehicleId: string,
    input: AddVehicleEquipmentRequest,
  ): Promise<VehicleEquipmentItem> {
    await this.requireOwnedVehicle(vehicleId, currentUser);

    const equipment = await db.equipment.findUnique({ where: { id: input.equipmentId } });
    if (!equipment) throw new NotFoundException('Equipment not found');

    const existing = await db.vehicleEquipment.findUnique({
      where: { vehicleId_equipmentId: { vehicleId, equipmentId: input.equipmentId } },
    });
    if (existing)
      throw new ConflictException('This equipment is already recorded for this vehicle.');

    const row = await db.vehicleEquipment.create({
      data: {
        id: createId('veq'),
        vehicleId,
        equipmentId: input.equipmentId,
        source: input.source,
      },
    });

    return {
      id: row.id,
      vehicleId: row.vehicleId,
      equipmentId: row.equipmentId,
      source: row.source,
    };
  }

  async removeEquipment(
    currentUser: CurrentUserType,
    vehicleId: string,
    equipmentRowId: string,
  ): Promise<void> {
    await this.requireOwnedVehicle(vehicleId, currentUser);

    const row = await db.vehicleEquipment.findUnique({ where: { id: equipmentRowId } });
    if (!row || row.vehicleId !== vehicleId) {
      throw new NotFoundException('Vehicle equipment not found');
    }
    await db.vehicleEquipment.delete({ where: { id: equipmentRowId } });
  }

  async addModification(
    currentUser: CurrentUserType,
    vehicleId: string,
    input: CreateVehicleModificationRequest,
  ): Promise<VehicleModificationItem> {
    await this.requireOwnedVehicle(vehicleId, currentUser);

    const row = await db.vehicleModification.create({
      data: {
        id: createId('vmd'),
        vehicleId,
        category: input.category,
        brand: input.brand,
        product: input.product,
        description: input.description,
      },
    });

    return {
      id: row.id,
      vehicleId: row.vehicleId,
      category: row.category,
      brand: row.brand,
      product: row.product,
      description: row.description,
    };
  }

  async removeModification(
    currentUser: CurrentUserType,
    vehicleId: string,
    modificationId: string,
  ): Promise<void> {
    await this.requireOwnedVehicle(vehicleId, currentUser);

    const row = await db.vehicleModification.findUnique({ where: { id: modificationId } });
    if (!row || row.vehicleId !== vehicleId) {
      throw new NotFoundException('Vehicle modification not found');
    }
    await db.vehicleModification.delete({ where: { id: modificationId } });
  }

  /** Every mutating endpoint's ownership check (§3: `vehicle.ownerId === currentUser.id || currentUser.isAdmin`, written explicitly per Plan 07 §5's rule). The caller already supplied `vehicleId`, so a missing/foreign vehicle is 404/403 respectively — never mistaken for "hide existence", which is Plan 10's `requireOwnedLookup` pattern below, reused only for the lookup a `Vehicle` is created from. */
  async requireOwnedVehicle(vehicleId: string, currentUser: CurrentUserType): Promise<VehicleRow> {
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.ownerId !== currentUser.id && !currentUser.isAdmin) {
      throw new ForbiddenException('You do not have access to this vehicle');
    }
    return vehicle;
  }

  /** Mirrors `VehicleLookupService.requireOwnedLookup` (Plan 10) — 404, not 403, so a guessed lookup id doesn't confirm its own existence either. */
  private async requireOwnedLookup(lookupId: string, userId: string) {
    const lookup = await db.vehicleLookup.findUnique({ where: { id: lookupId } });
    if (!lookup || lookup.requestedByUserId !== userId) {
      throw new NotFoundException('Vehicle lookup not found');
    }
    return lookup;
  }

  async toVehicleWithLinks(vehicle: VehicleRow): Promise<Vehicle> {
    const [equipment, modifications] = await Promise.all([
      db.vehicleEquipment.findMany({ where: { vehicleId: vehicle.id } }),
      db.vehicleModification.findMany({ where: { vehicleId: vehicle.id } }),
    ]);
    return this.toVehicle(vehicle, equipment, modifications);
  }

  private toVehicle(
    vehicle: VehicleRow,
    equipment: Array<{ id: string; vehicleId: string; equipmentId: string; source: string }>,
    modifications: Array<{
      id: string;
      vehicleId: string;
      category: string;
      brand: string | null;
      product: string | null;
      description: string | null;
    }>,
  ): Vehicle {
    return {
      id: vehicle.id,
      ownerId: vehicle.ownerId,
      derivativeId: vehicle.derivativeId,
      vehicleLookupId: vehicle.vehicleLookupId,
      registration: vehicle.registration,
      firstRegisteredAt: vehicle.firstRegisteredAt ? vehicle.firstRegisteredAt.toISOString() : null,
      mileageMiles: vehicle.mileageMiles,
      ownersCount: vehicle.ownersCount,
      colourFamily: vehicle.colourFamily,
      manufacturerColourId: vehicle.manufacturerColourId,
      interiorDescription: vehicle.interiorDescription,
      upholstery: vehicle.upholstery,
      ukSupplied: vehicle.ukSupplied,
      imported: vehicle.imported,
      importCountry: vehicle.importCountry,
      serviceHistoryType: vehicle.serviceHistoryType,
      mainDealerHistory: vehicle.mainDealerHistory,
      serviceRecordsAvailable: vehicle.serviceRecordsAvailable,
      accidentDeclared: vehicle.accidentDeclared,
      writeOffCategory: vehicle.writeOffCategory,
      dvlaTaxStatus: vehicle.dvlaTaxStatus,
      dvlaMotStatus: vehicle.dvlaMotStatus,
      dvlaMotExpiryDate: vehicle.dvlaMotExpiryDate ? vehicle.dvlaMotExpiryDate.toISOString() : null,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
      equipment: equipment.map((item) => ({
        id: item.id,
        vehicleId: item.vehicleId,
        equipmentId: item.equipmentId,
        source: item.source as VehicleEquipmentItem['source'],
      })),
      modifications: modifications.map((item) => ({
        id: item.id,
        vehicleId: item.vehicleId,
        category: item.category as VehicleModificationItem['category'],
        brand: item.brand,
        product: item.product,
        description: item.description,
      })),
    };
  }
}
