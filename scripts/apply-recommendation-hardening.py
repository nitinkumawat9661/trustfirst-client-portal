#!/usr/bin/env python3
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


service_path = Path("apps/web/src/server/hardware/hardware-service.ts")
service = service_path.read_text(encoding="utf-8")

service = replace_once(
    service,
    '''      const customFields = asRecord(party.customFields);
      if (customFields.hardwarePartyRole !== role) return [];
      const openingBalanceCents = readInteger(customFields.openingBalanceCents) ?? 0;''',
    '''      const customFields = asRecord(party.customFields);
      if (!hardwarePartyRoles(customFields).includes(role)) return [];
      const openingBalanceCents = openingBalanceForRole(customFields, role);''',
    "listParties role filtering",
)

old_method = '''  async quickCreateParty(context: ActorContext, input: QuickHardwarePartyInput): Promise<HardwarePartySummary> {
    await this.enforce(context, input.role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage");
    const normalizedName = normalizeComparable(input.name);
    const normalizedMobile = normalizeMobile(input.mobile);
    const existing = await this.prisma.clientOrganization.findMany({
      include: { contacts: { select: { phone: true } } },
      where: { archivedAt: null, deletedAt: null, tenantId: context.tenantId },
    });
    const duplicate = existing.find((party) => {
      const customFields = asRecord(party.customFields);
      if (customFields.hardwarePartyRole !== input.role) return false;
      const sameName = normalizeComparable(party.name) === normalizedName;
      const existingMobile = normalizeMobile(party.contacts[0]?.phone ?? readText(customFields.phone));
      const sameMobile = normalizedMobile && existingMobile === normalizedMobile;
      return sameName || Boolean(sameMobile);
    });
    if (duplicate) {
      throw validation(`${input.role === "supplier" ? "Supplier" : "Customer"} already exists. Select the existing record.`);
    }
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const signedOpening =
      openingBalanceCents === 0
        ? 0
        : input.balanceDirection === "CR"
          ? -openingBalanceCents
          : openingBalanceCents;
    const party = await this.prisma.clientOrganization.create({
      data: {
        customFields: stripUndefined({
          address: input.address,
          gstin: input.gstin,
          hardwarePartyRole: input.role,
          openingBalanceCents: signedOpening,
          openingBalanceDirection: input.balanceDirection,
          phone: normalizedMobile,
        }) as Prisma.InputJsonValue,
        lifecycleStage: "CLIENT",
        name: input.name,
        slug: await this.nextPartySlug(context.tenantId, input.name),
        tenantId: context.tenantId,
      },
    });
    if (normalizedMobile) {
      await this.prisma.clientContact.create({
        data: {
          clientId: party.id,
          email: `${party.id}@local.invalid`,
          isPrimary: true,
          name: input.name,
          normalizedEmail: `${party.id}@local.invalid`,
          phone: normalizedMobile,
          tenantId: context.tenantId,
        },
      });
    }
    return {
      balanceSide: signedOpening === 0 ? null : input.role === "supplier" ? (signedOpening > 0 ? "CR" : "DR") : (signedOpening > 0 ? "DR" : "CR"),
      contact: normalizedMobile ?? null,
      currentBalanceCents: signedOpening,
      gstin: input.gstin ?? null,
      id: party.id,
      name: party.name,
      openingBalanceCents: signedOpening,
      role: input.role,
    };
  }'''

new_method = '''  async quickCreateParty(context: ActorContext, input: QuickHardwarePartyInput): Promise<HardwarePartySummary> {
    await this.enforce(context, input.role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage");
    const normalizedName = normalizeComparable(input.name);
    const normalizedMobile = normalizeMobile(input.mobile);
    const existing = await this.prisma.clientOrganization.findMany({
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, phone: true },
          take: 1,
        },
      },
      where: { archivedAt: null, deletedAt: null, tenantId: context.tenantId },
    });
    const duplicate = existing.find((party) => {
      const customFields = asRecord(party.customFields);
      const sameName = normalizeComparable(party.name) === normalizedName;
      const existingMobile = normalizeMobile(party.contacts[0]?.phone ?? readText(customFields.phone));
      const sameMobile = Boolean(normalizedMobile && existingMobile === normalizedMobile);
      return sameName || sameMobile;
    });
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const signedOpening =
      openingBalanceCents === 0
        ? 0
        : input.balanceDirection === "CR"
          ? -openingBalanceCents
          : openingBalanceCents;

    if (duplicate) {
      const customFields = asRecord(duplicate.customFields);
      const roles = hardwarePartyRoles(customFields);
      const mergedRoles = roles.includes(input.role) ? roles : [...roles, input.role];
      const balances = {
        customer: openingBalanceForRole(customFields, "customer"),
        supplier: openingBalanceForRole(customFields, "supplier"),
      };
      if (input.openingBalanceCents !== undefined) balances[input.role] = signedOpening;
      const nextCustomFields = stripUndefined({
        ...customFields,
        address: input.address ?? readText(customFields.address),
        gstin: input.gstin ?? readText(customFields.gstin),
        hardwareOpeningBalances: balances,
        hardwarePartyRole: readText(customFields.hardwarePartyRole) ?? mergedRoles[0] ?? input.role,
        hardwarePartyRoles: mergedRoles,
        phone: normalizedMobile ?? readText(customFields.phone),
      });
      await this.prisma.clientOrganization.update({
        data: { customFields: nextCustomFields as Prisma.InputJsonValue },
        where: { id: duplicate.id },
      });
      const contact = duplicate.contacts[0];
      if (normalizedMobile && contact?.phone !== normalizedMobile) {
        if (contact) {
          await this.prisma.clientContact.update({
            data: { phone: normalizedMobile },
            where: { id: contact.id },
          });
        } else {
          await this.prisma.clientContact.create({
            data: {
              clientId: duplicate.id,
              email: `${duplicate.id}@local.invalid`,
              isPrimary: true,
              name: duplicate.name,
              normalizedEmail: `${duplicate.id}@local.invalid`,
              phone: normalizedMobile,
              tenantId: context.tenantId,
            },
          });
        }
      }
      const roleOpeningBalance = balances[input.role];
      return {
        balanceSide: roleOpeningBalance === 0 ? null : input.role === "supplier" ? (roleOpeningBalance > 0 ? "CR" : "DR") : (roleOpeningBalance > 0 ? "DR" : "CR"),
        contact: normalizedMobile ?? contact?.phone ?? readText(customFields.phone) ?? null,
        currentBalanceCents: roleOpeningBalance,
        gstin: input.gstin ?? readText(customFields.gstin) ?? null,
        id: duplicate.id,
        name: duplicate.name,
        openingBalanceCents: roleOpeningBalance,
        role: input.role,
      };
    }

    const party = await this.prisma.clientOrganization.create({
      data: {
        customFields: stripUndefined({
          address: input.address,
          gstin: input.gstin,
          hardwareOpeningBalances: { [input.role]: signedOpening },
          hardwarePartyRole: input.role,
          hardwarePartyRoles: [input.role],
          openingBalanceCents: signedOpening,
          openingBalanceDirection: input.balanceDirection,
          phone: normalizedMobile,
        }) as Prisma.InputJsonValue,
        lifecycleStage: "CLIENT",
        name: input.name,
        slug: await this.nextPartySlug(context.tenantId, input.name),
        tenantId: context.tenantId,
      },
    });
    if (normalizedMobile) {
      await this.prisma.clientContact.create({
        data: {
          clientId: party.id,
          email: `${party.id}@local.invalid`,
          isPrimary: true,
          name: input.name,
          normalizedEmail: `${party.id}@local.invalid`,
          phone: normalizedMobile,
          tenantId: context.tenantId,
        },
      });
    }
    return {
      balanceSide: signedOpening === 0 ? null : input.role === "supplier" ? (signedOpening > 0 ? "CR" : "DR") : (signedOpening > 0 ? "DR" : "CR"),
      contact: normalizedMobile ?? null,
      currentBalanceCents: signedOpening,
      gstin: input.gstin ?? null,
      id: party.id,
      name: party.name,
      openingBalanceCents: signedOpening,
      role: input.role,
    };
  }'''
service = replace_once(service, old_method, new_method, "quickCreateParty")

service = replace_once(
    service,
    '''function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\\D/gu, "").replace(/^0+/u, "") ?? "";
  if (!digits) return undefined;
  return digits.length === 10 ? `91${digits}` : digits;
}
''',
    '''function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\\D/gu, "").replace(/^0+/u, "") ?? "";
  if (!digits) return undefined;
  return digits.length === 10 ? `91${digits}` : digits;
}

function hardwarePartyRoles(customFields: Record<string, unknown>): HardwarePartyRole[] {
  const roles = Array.isArray(customFields.hardwarePartyRoles)
    ? customFields.hardwarePartyRoles.filter(
        (role): role is HardwarePartyRole => role === "customer" || role === "supplier",
      )
    : [];
  const legacyRole = readText(customFields.hardwarePartyRole);
  if ((legacyRole === "customer" || legacyRole === "supplier") && !roles.includes(legacyRole)) {
    roles.push(legacyRole);
  }
  return roles;
}

function openingBalanceForRole(customFields: Record<string, unknown>, role: HardwarePartyRole) {
  const balances = asRecord(customFields.hardwareOpeningBalances);
  const explicit = readInteger(balances[role]);
  if (explicit !== undefined) return explicit;
  return readText(customFields.hardwarePartyRole) === role
    ? readInteger(customFields.openingBalanceCents) ?? 0
    : 0;
}
''',
    "party-role helpers",
)

service_path.write_text(service, encoding="utf-8")

form_path = Path("apps/web/src/components/hardware/hardware-trade-form.tsx")
form = form_path.read_text(encoding="utf-8")

form = replace_once(
    form,
    '''  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "purchase" && parties.length === 0
        ? "Add at least one supplier before creating a purchase document."
        : mode === "quotation" && locations.length === 0
          ? "Add at least one stock location before creating an Estimate Bill."
          : null;''',
    '''  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "quotation" && locations.length === 0
        ? "Add at least one stock location before creating an Estimate Bill."
        : null;''',
    "purchase disabled reason",
)

old_resolver = '''  async function resolveCustomerId(values: TradeFormValues) {
    if (mode === "purchase") return values.partyId;
    if (values.partyId) return values.partyId;

    const normalizedName = normalizeProductSearchText(partyName);
    if (!normalizedName) {
      throw new Error("Enter or select a customer name.");
    }

    const exact = availableParties.find(
      (party) => normalizeProductSearchText(party.name) === normalizedName,
    );
    if (exact) return exact.id;

    const created = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      name: partyName.trim(),
      role: "customer",
    });
    if (!created.ok) throw new Error(created.message);

    setAvailableParties((current) => [created.data, ...current]);
    setPartyName(created.data.name);
    setValue("partyId", created.data.id, { shouldDirty: true });
    return created.data.id;
  }'''
new_resolver = '''  async function createOrSelectParty(name: string, role: "customer" | "supplier") {
    const normalizedName = normalizeProductSearchText(name);
    if (!normalizedName) throw new Error(`Enter or select a ${role} name.`);
    const exact = availableParties.find(
      (party) => normalizeProductSearchText(party.name) === normalizedName,
    );
    if (exact) {
      setPartyName(exact.name);
      setValue("partyId", exact.id, { shouldDirty: true });
      return exact.id;
    }
    const created = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      name: name.trim(),
      role,
    });
    if (!created.ok) throw new Error(created.message);
    setAvailableParties((current) => [created.data, ...current.filter((party) => party.id !== created.data.id)]);
    setPartyName(created.data.name);
    setValue("partyId", created.data.id, { shouldDirty: true });
    return created.data.id;
  }

  async function resolvePartyId(values: TradeFormValues) {
    if (values.partyId) return values.partyId;
    return createOrSelectParty(partyName, mode === "purchase" ? "supplier" : "customer");
  }'''
form = replace_once(form, old_resolver, new_resolver, "party resolver")
form = replace_once(form, "      const partyId = await resolveCustomerId(values);", "      const partyId = await resolvePartyId(values);", "resolver call")

old_party_block = '''          {mode === "purchase" ? (
            <FormField label="Supplier" required>
              <select className={selectClassName} {...register("partyId")}>
                <option value="">Select supplier</option>
                {availableParties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </FormField>
          ) : (
            <>
              <div className="xl:col-span-2">
                <input type="hidden" {...register("partyId")} />
                <CreatableCombobox
                  label="Customer"
                  onQueryChange={(query) => {
                    setPartyName(query);
                    const exact = availableParties.find(
                      (party) => normalizeProductSearchText(party.name) === normalizeProductSearchText(query),
                    );
                    setValue("partyId", exact?.id ?? "", { shouldDirty: true });
                  }}
                  onSelect={(id) => {
                    const selected = availableParties.find((party) => party.id === id);
                    setValue("partyId", id, { shouldDirty: true });
                    setPartyName(selected?.name ?? "");
                  }}
                  options={availableParties.map((party) => ({
                    id: party.id,
                    keywords: [party.contact ?? ""],
                    label: party.name,
                  }))}
                  placeholder="Select existing or type a new customer name"
                  value={partyName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A new customer is created automatically with name only when no exact existing name is found.
                </p>
              </div>
              <FormField error={errors.customerAddress?.message} label="Address">
                <Input autoComplete="street-address" placeholder="Address for this document" {...register("customerAddress")} />
              </FormField>
            </>
          )}'''
new_party_block = '''          <div className="xl:col-span-2">
            <input type="hidden" {...register("partyId")} />
            <CreatableCombobox
              createLabel={mode === "purchase" ? "Use new supplier" : "Use new customer"}
              label={mode === "purchase" ? "Supplier" : "Customer"}
              onCreate={(name) => {
                setServerError(null);
                void createOrSelectParty(name, mode === "purchase" ? "supplier" : "customer").catch((error) => {
                  setServerError(error instanceof Error ? error.message : "Party could not be created.");
                });
              }}
              onQueryChange={(query) => {
                setPartyName(query);
                const exact = availableParties.find(
                  (party) => normalizeProductSearchText(party.name) === normalizeProductSearchText(query),
                );
                setValue("partyId", exact?.id ?? "", { shouldDirty: true });
              }}
              onSelect={(id) => {
                const selected = availableParties.find((party) => party.id === id);
                setValue("partyId", id, { shouldDirty: true });
                setPartyName(selected?.name ?? "");
              }}
              options={availableParties.map((party) => ({
                id: party.id,
                keywords: [party.contact ?? ""],
                label: party.name,
              }))}
              placeholder={mode === "purchase" ? "Search or enter supplier" : "Search or enter customer"}
              value={partyName}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Existing names are selected automatically. A party can act as both customer and supplier without creating a duplicate record.
            </p>
          </div>
          {mode !== "purchase" ? (
            <FormField error={errors.customerAddress?.message} label="Address">
              <Input autoComplete="street-address" placeholder="Address for this document" {...register("customerAddress")} />
            </FormField>
          ) : null}'''
form = replace_once(form, old_party_block, new_party_block, "party input block")

form_path.write_text(form, encoding="utf-8")
print("RECOMMENDATION_HARDENING_SOURCE_APPLIED")
