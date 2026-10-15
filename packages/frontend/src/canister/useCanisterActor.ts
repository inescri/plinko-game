import { useEffect, useState } from "react";
import type { OdinConnectedUser } from "odin-connect";

import { createCanisterActor } from "./actor.ts";
import { APP_CANISTER_ID } from "./config.ts";
import type { CanisterActor } from "./idl.ts";

/**
 * Build a typed app-canister actor from the connected session's delegation
 * identity. Null until a delegated session exists (or when no canister id is
 * configured) — callers treat null as "canister calls unavailable".
 */
export function useCanisterActor(
  user: OdinConnectedUser | null,
): CanisterActor | null {
  const [actor, setActor] = useState<CanisterActor | null>(null);

  useEffect(() => {
    let active = true;
    const identity = user?.getIdentity() ?? null;

    if (identity !== null && APP_CANISTER_ID !== "") {
      createCanisterActor(identity)
        .then((a) => {
          if (active) setActor(a);
        })
        .catch((err) => {
          console.error("Failed to create canister actor:", err);
          if (active) setActor(null);
        });
    } else {
      setActor(null);
    }

    return () => {
      active = false;
    };
  }, [user]);

  return actor;
}
