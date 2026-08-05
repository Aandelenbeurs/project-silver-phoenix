"use client";

import {
  useEffect,
  useState,
} from "react";

type WorkspaceType =
  | "live"
  | "simulation"
  | "scenario";

type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  isReadOnly: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type WorkspaceApiResponse = {
  success: boolean;
  activeWorkspaceId?: string;
  workspaces?: Workspace[];
  workspace?: Workspace;
  error?: string;
};

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);

  const [
    activeWorkspaceId,
    setActiveWorkspaceId,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [newWorkspaceName, setNewWorkspaceName] =
    useState("");

  const [
    newWorkspaceType,
    setNewWorkspaceType,
  ] = useState<
    "simulation" | "scenario"
  >("simulation");

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaces() {
      try {
        setError(null);

        const response = await fetch(
          "/api/workspaces",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as WorkspaceApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ??
              "Workspaces konden niet worden geladen.",
          );
        }

        if (!isMounted) {
          return;
        }

        setWorkspaces(
          data.workspaces ?? [],
        );

        setActiveWorkspaceId(
          data.activeWorkspaceId ?? "",
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Onbekende fout bij het laden van workspaces.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleWorkspaceChange(
    workspaceId: string,
  ): Promise<void> {
    if (
      workspaceId === activeWorkspaceId ||
      isSaving
    ) {
      return;
    }

    const previousWorkspaceId =
      activeWorkspaceId;

    setActiveWorkspaceId(workspaceId);
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/workspaces",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            workspaceId,
          }),
        },
      );

      const data =
        (await response.json()) as WorkspaceApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Workspace kon niet worden gewijzigd.",
        );
      }

      window.location.reload();
    } catch (saveError) {
      setActiveWorkspaceId(
        previousWorkspaceId,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Onbekende fout bij het wijzigen van de workspace.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateWorkspace(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedName =
      newWorkspaceName.trim();

    if (trimmedName.length < 2) {
      setError(
        "De naam moet minimaal 2 tekens bevatten.",
      );

      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/workspaces",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            type: newWorkspaceType,
          }),
        },
      );

      const data =
        (await response.json()) as WorkspaceApiResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.workspace
      ) {
        throw new Error(
          data.error ??
            "Workspace kon niet worden aangemaakt.",
        );
      }

      setWorkspaces((current) => [
        ...current,
        data.workspace as Workspace,
      ]);

      setActiveWorkspaceId(
        data.workspace.id,
      );

      setNewWorkspaceName("");
      setNewWorkspaceType("simulation");
      setIsCreateOpen(false);

      window.location.reload();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Onbekende fout bij het aanmaken van de workspace.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeCreateForm(): void {
    if (isSaving) {
      return;
    }

    setIsCreateOpen(false);
    setNewWorkspaceName("");
    setNewWorkspaceType("simulation");
    setError(null);
  }

  const activeWorkspace =
    workspaces.find(
      (workspace) =>
        workspace.id ===
        activeWorkspaceId,
    );

  return (
    <div className="workspace-selector">
      <div className="workspace-selector-copy">
        <span className="workspace-selector-label">
          Workspace
        </span>

        <strong>
          {activeWorkspace?.name ??
            "Geen workspace"}
        </strong>

        <small>
          {activeWorkspace?.type === "live"
            ? "Actieve portefeuille"
            : activeWorkspace?.type ===
                "scenario"
              ? "Scenario"
              : activeWorkspace?.type ===
                  "simulation"
                ? "Simulatie"
                : "Niet geladen"}
        </small>
      </div>

      <div className="workspace-selector-control">
        <select
          value={activeWorkspaceId}
          onChange={(event) =>
            void handleWorkspaceChange(
              event.target.value,
            )
          }
          disabled={
            isLoading ||
            isSaving ||
            workspaces.length === 0
          }
          aria-label="Actieve workspace"
        >
          {isLoading ? (
            <option value="">
              Workspaces laden...
            </option>
          ) : (
            workspaces.map(
              (workspace) => (
                <option
                  key={workspace.id}
                  value={workspace.id}
                >
                  {workspace.name}
                </option>
              ),
            )
          )}
        </select>

        <span
          className={`workspace-status-dot ${
            activeWorkspace?.type === "live"
              ? "is-live"
              : ""
          }`}
        />

        <button
          type="button"
          className="workspace-create-button"
          onClick={() =>
            setIsCreateOpen(
              (current) => !current,
            )
          }
          disabled={
            isLoading || isSaving
          }
          aria-expanded={isCreateOpen}
        >
          + Nieuw
        </button>

        {isSaving && (
          <small>Bezig...</small>
        )}
      </div>

      {isCreateOpen && (
        <form
          className="workspace-create-form"
          onSubmit={(event) =>
            void handleCreateWorkspace(
              event,
            )
          }
        >
          <label>
            <span>Naam</span>

            <input
              type="text"
              value={newWorkspaceName}
              onChange={(event) =>
                setNewWorkspaceName(
                  event.target.value,
                )
              }
              placeholder="Bijvoorbeeld Silver $100"
              autoFocus
              disabled={isSaving}
            />
          </label>

          <label>
            <span>Type</span>

            <select
              value={newWorkspaceType}
              onChange={(event) =>
                setNewWorkspaceType(
                  event.target.value as
                    | "simulation"
                    | "scenario",
                )
              }
              disabled={isSaving}
            >
              <option value="simulation">
                Simulatie
              </option>

              <option value="scenario">
                Scenario
              </option>
            </select>
          </label>

          <div className="workspace-create-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={closeCreateForm}
              disabled={isSaving}
            >
              Annuleren
            </button>

            <button
              type="submit"
              className="primary-button workspace-submit-button"
              disabled={
                isSaving ||
                newWorkspaceName.trim().length < 2
              }
            >
              {isSaving
                ? "Aanmaken..."
                : "Aanmaken"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="workspace-selector-error">
          {error}
        </p>
      )}
    </div>
  );
}