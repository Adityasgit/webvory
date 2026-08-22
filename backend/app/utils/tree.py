"""Org hierarchy helpers cycle prevention (PlayStack treeBuilder port)."""

from __future__ import annotations

from uuid import UUID


def would_create_cycle(
    reporting_map: dict[UUID, UUID | None],
    employee_id: UUID,
    new_manager_id: UUID | None,
) -> bool:
    """Return True if assigning new_manager_id to employee_id would cycle."""
    if new_manager_id is None:
        return False
    if new_manager_id == employee_id:
        return True
    current: UUID | None = new_manager_id
    seen: set[UUID] = set()
    while current is not None:
        if current == employee_id:
            return True
        if current in seen:
            return True
        seen.add(current)
        current = reporting_map.get(current)
    return False
