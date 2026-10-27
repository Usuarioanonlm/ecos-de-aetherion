import { useMemo, useState } from "react";
import {
  compareItems,
  getInventoryEntries,
  getItemDefinition,
  type EquipmentSlot,
  type InventoryState,
  type ItemKind,
  type ItemRarity,
} from "../../game/items";
import "./progression.css";

type InventoryFilter = "todos" | ItemKind;

export type InventoryPanelProps = {
  state: InventoryState;
  onUse?: (itemId: string) => void;
  onEquip?: (itemId: string) => void;
  onUnequip?: (slot: EquipmentSlot) => void;
  onClose?: () => void;
};

const filterLabels: Record<InventoryFilter, string> = {
  todos: "Todos",
  arma: "Armas",
  armadura: "Armaduras",
  consumivel: "Consumíveis",
  material: "Materiais",
  acessorio: "Acessórios",
  missao: "Missão",
};

const rarityLabels: Record<ItemRarity, string> = {
  comum: "Comum",
  incomum: "Incomum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};

const slotLabels: Record<EquipmentSlot, string> = {
  weapon: "Arma",
  armor: "Armadura",
  accessory: "Acessório",
};

const kindMatches = (kind: ItemKind, filter: InventoryFilter) =>
  filter === "todos" || kind === filter;

const modifierLabels: Record<string, string> = {
  vitality: "Vitalidade",
  power: "Poder",
  ether: "Éter",
  agility: "Agilidade",
  resolve: "Resolução",
  attack: "Ataque",
  defense: "Defesa",
  magicAttack: "Ataque mágico",
  speed: "Velocidade",
  criticalChance: "Crítico",
  evasion: "Esquiva",
  maxHealth: "Vida máxima",
  maxFocus: "Foco máximo",
};

const modifiersText = (modifiers: Record<string, number> | undefined) =>
  Object.entries(modifiers ?? {})
    .filter(([, value]) => value !== 0)
    .map(
      ([key, value]) =>
        `${modifierLabels[key] ?? key} ${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : Math.round(value * 100) + "%"}`
    )
    .join(" · ");

export default function InventoryPanel({
  state,
  onUse,
  onEquip,
  onUnequip,
  onClose,
}: InventoryPanelProps) {
  const [filter, setFilter] = useState<InventoryFilter>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = useMemo(
    () =>
      getInventoryEntries(state).filter(entry =>
        kindMatches(entry.definition.kind, filter)
      ),
    [filter, state]
  );
  const selected = selectedId
    ? getItemDefinition(selectedId)
    : entries[0]?.definition;
  const selectedQuantity = selected ? (state.items[selected.id] ?? 0) : 0;
  const selectedSlot = selected?.equipmentSlot;
  const equippedId = selectedSlot ? state.equipped[selectedSlot] : undefined;
  const comparison = selected
    ? compareItems(state, selected.id, selectedSlot)
    : undefined;

  return (
    <section
      className="progression-panel inventory-panel"
      aria-label="Inventário"
    >
      <header className="progression-panel__header">
        <div>
          <span className="progression-eyebrow">BOLSA DO ECO</span>
          <h2>Inventário</h2>
          <p>Armas, equipamentos e recursos para sua jornada.</p>
        </div>
        {onClose && (
          <button
            className="progression-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Fechar inventário"
          >
            ×
          </button>
        )}
      </header>
      <nav className="inventory-filters" aria-label="Categorias do inventário">
        {(Object.keys(filterLabels) as InventoryFilter[]).map(key => (
          <button
            type="button"
            className={filter === key ? "is-selected" : ""}
            key={key}
            onClick={() => setFilter(key)}
          >
            {filterLabels[key]}
          </button>
        ))}
      </nav>
      <div className="inventory-panel__layout">
        <div className="inventory-grid" aria-label="Itens da bolsa">
          {entries.map(({ definition, itemId, quantity }) => {
            const equipped = Object.values(state.equipped).includes(itemId);
            return (
              <button
                type="button"
                key={itemId}
                className={`inventory-item inventory-item--${definition.rarity} ${selected?.id === itemId ? "is-selected" : ""}`}
                onClick={() => setSelectedId(itemId)}
              >
                <span className="inventory-item__icon">
                  {definition.kind === "consumivel"
                    ? "✦"
                    : definition.kind === "arma"
                      ? "⚔"
                      : definition.kind === "material"
                        ? "◇"
                        : definition.kind === "missao"
                          ? "◆"
                          : "◈"}
                </span>
                <strong>{definition.name}</strong>
                <span className="inventory-item__quantity">×{quantity}</span>
                <small>
                  {rarityLabels[definition.rarity]}
                  {equipped ? " · Equipado" : ""}
                </small>
              </button>
            );
          })}
          {!entries.length && (
            <p className="progression-empty">Nenhum item nessa categoria.</p>
          )}
        </div>
        {selected && (
          <article className="inventory-detail">
            <div className="inventory-detail__title">
              <div>
                <span
                  className={`inventory-rarity inventory-rarity--${selected.rarity}`}
                >
                  {rarityLabels[selected.rarity]}
                </span>
                <h3>{selected.name}</h3>
              </div>
              <strong>×{selectedQuantity}</strong>
            </div>
            <p>{selected.description}</p>
            {selected.equipmentSlot && (
              <span className="inventory-slot">
                Espaço: {slotLabels[selected.equipmentSlot]}
              </span>
            )}
            {selected.modifiers && (
              <div className="inventory-modifiers">
                <b>Atributos</b>
                <span>{modifiersText(selected.modifiers)}</span>
              </div>
            )}
            {comparison?.equipped && (
              <div className="inventory-comparison">
                <b>Comparação com {comparison.equipped.name}</b>
                <span>
                  {modifiersText(comparison.deltas) ||
                    "Sem diferença de atributos"}
                </span>
              </div>
            )}
            <div className="inventory-detail__actions">
              {selected.kind === "consumivel" && (
                <button
                  type="button"
                  className="progression-button progression-button--primary"
                  disabled={!selectedQuantity}
                  onClick={() => onUse?.(selected.id)}
                >
                  Usar
                </button>
              )}
              {selected.equipmentSlot && equippedId !== selected.id && (
                <button
                  type="button"
                  className="progression-button progression-button--primary"
                  disabled={!selectedQuantity}
                  onClick={() => onEquip?.(selected.id)}
                >
                  Equipar
                </button>
              )}
              {selected.equipmentSlot && equippedId === selected.id && (
                <button
                  type="button"
                  className="progression-button progression-button--quiet"
                  onClick={() => onUnequip?.(selected.equipmentSlot!)}
                >
                  Desequipar
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
