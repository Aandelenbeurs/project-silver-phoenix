"use client";

import {
  useEffect,
  useState,
} from "react";

type WorkspaceType =
  | "live"
  | "portfolio"
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
  sourceWorkspaceId?: string;
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

  const [isDuplicateOpen, setIsDuplicateOpen] =
    useState(false);

    const [
  isRenameOpen,
  setIsRenameOpen,
] = useState(false);

  const [
  renameWorkspaceName,
  setRenameWorkspaceName,
] = useState("");

    const [isDeleteOpen, setIsDeleteOpen] =
  useState(false);

  const [newWorkspaceName, setNewWorkspaceName] =
    useState("");

  const [
    duplicateWorkspaceName,
    setDuplicateWorkspaceName,
  ] = useState("");

const [
  newWorkspaceType,
  setNewWorkspaceType,
] = useState<
  "portfolio" | "simulation" | "scenario"
>("portfolio");

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
      setNewWorkspaceType("portfolio");
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

  async function handleDuplicateWorkspace(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedName =
      duplicateWorkspaceName.trim();

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
        "/api/workspaces/duplicate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
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
            "Workspace kon niet worden gedupliceerd.",
        );
      }

      setWorkspaces((current) => [
        ...current,
        data.workspace as Workspace,
      ]);

      setActiveWorkspaceId(
        data.workspace.id,
      );

      setDuplicateWorkspaceName("");
      setIsDuplicateOpen(false);

      window.location.reload();
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Onbekende fout bij het dupliceren van de workspace.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRenameWorkspace(
  event: React.FormEvent<HTMLFormElement>,
): Promise<void> {
  event.preventDefault();

  if (
    !activeWorkspace ||
    activeWorkspace.type === "live" ||
    isSaving
  ) {
    return;
  }

  const trimmedName =
    renameWorkspaceName.trim();

  if (trimmedName.length < 2) {
    setError(
      "De naam moet minimaal 2 tekens bevatten.",
    );

    return;
  }

  if (trimmedName === activeWorkspace.name) {
    setIsRenameOpen(false);
    setRenameWorkspaceName("");
    setError(null);

    return;
  }

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
          workspaceId:
            activeWorkspace.id,
          name:
            trimmedName,
        }),
      },
    );

    const data =
      (await response.json()) as
        WorkspaceApiResponse;

    if (
      !response.ok ||
      !data.success ||
      !data.workspace
    ) {
      throw new Error(
        data.error ??
          "Workspace kon niet worden hernoemd.",
      );
    }

    setIsRenameOpen(false);
    setRenameWorkspaceName("");

    window.location.reload();
  } catch (renameError) {
    setError(
      renameError instanceof Error
        ? renameError.message
        : "Onbekende fout bij het hernoemen van de workspace.",
    );
  } finally {
    setIsSaving(false);
  }
}

async function handleDeleteWorkspace(): Promise<void> {
  if (
    !activeWorkspace ||
    activeWorkspace.type === "live" ||
    isSaving
  ) {
    return;
  }

  setIsSaving(true);
  setError(null);

  try {
    const response = await fetch(
      "/api/workspaces",
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          workspaceId:
            activeWorkspace.id,
        }),
      },
    );

    const data =
      (await response.json()) as {
        success?: boolean;
        activeWorkspaceId?: string;
        error?: string;
      };

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ??
          "Workspace kon niet worden verwijderd.",
      );
    }

    setIsDeleteOpen(false);

    window.location.reload();
  } catch (deleteError) {
    setError(
      deleteError instanceof Error
        ? deleteError.message
        : "Onbekende fout bij het verwijderen van de workspace.",
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
    setNewWorkspaceType("portfolio");
    setError(null);
  }

  function closeDuplicateForm(): void {
    if (isSaving) {
      return;
    }

    setIsDuplicateOpen(false);
    setDuplicateWorkspaceName("");
    setError(null);
  }

  const activeWorkspace =
    workspaces.find(
      (workspace) =>
        workspace.id ===
        activeWorkspaceId,
    );

  function openCreateForm(): void {
    if (isSaving) {
      return;
    }

    setIsDuplicateOpen(false);
    setDuplicateWorkspaceName("");
    setIsCreateOpen((current) => !current);
    setError(null);
  }

  function openDuplicateForm(): void {
    if (
      isSaving ||
      !activeWorkspace
    ) {
      return;
    }

    setIsCreateOpen(false);
    setNewWorkspaceName("");
    setIsDuplicateOpen((current) => !current);

    if (!isDuplicateOpen) {
      setDuplicateWorkspaceName(
        `${activeWorkspace.name} kopie`,
      );
    }

    setError(null);
  }

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
                "portfolio"
                ? "Portfolio"
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
          onClick={openCreateForm}
          disabled={
            isLoading || isSaving
          }
          aria-expanded={isCreateOpen}
        >
          + Nieuw
        </button>

        <button
          type="button"
          className="workspace-create-button"
          onClick={openDuplicateForm}
          disabled={
            isLoading ||
            isSaving ||
            !activeWorkspace
          }
          aria-expanded={isDuplicateOpen}
        >
          ⧉ Dupliceren
        </button>

        {activeWorkspace &&
  activeWorkspace.type !== "live" && (
    <button
      type="button"
      className="workspace-create-button"
      onClick={() => {
        setIsCreateOpen(false);
        setIsDuplicateOpen(false);
        setIsDeleteOpen(false);

        setIsRenameOpen(
          (current) => !current,
        );

        if (!isRenameOpen) {
          setRenameWorkspaceName(
            activeWorkspace.name,
          );
        }

        setError(null);
      }}
      disabled={
        isLoading || isSaving
      }
      aria-expanded={isRenameOpen}
    >
      Hernoemen
    </button>
  )}

        {activeWorkspace &&
  activeWorkspace.type !== "live" && (
    <button
      type="button"
      className="workspace-delete-button"
      onClick={() => {
        setIsCreateOpen(false);
        setIsDuplicateOpen(false);
        setIsDeleteOpen(true);
        setError(null);
      }}
      disabled={
        isLoading || isSaving
      }
      aria-expanded={isDeleteOpen}
    >
      Verwijderen
    </button>
  )}

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
                    | "portfolio"
                    | "simulation"
                    | "scenario",
                )
              }
              disabled={isSaving}
            >
              <option value="portfolio">
                Portfolio
              </option>

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

      {isDuplicateOpen && activeWorkspace && (
        <form
          className="workspace-create-form"
          onSubmit={(event) =>
            void handleDuplicateWorkspace(
              event,
            )
          }
        >
          <label>
            <span>Nieuwe naam</span>

            <input
              type="text"
              value={duplicateWorkspaceName}
              onChange={(event) =>
                setDuplicateWorkspaceName(
                  event.target.value,
                )
              }
              placeholder="Bijvoorbeeld Silver $100"
              autoFocus
              disabled={isSaving}
            />
          </label>

          <div>
            <span className="workspace-selector-label">
              Bron
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "7px",
              }}
            >
              {activeWorkspace.name}
            </strong>

            <small
              style={{
                color: "var(--muted)",
              }}
            >
              Holdings, instellingen en transacties
              worden gekopieerd.
            </small>
          </div>

          <div className="workspace-create-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={closeDuplicateForm}
              disabled={isSaving}
            >
              Annuleren
            </button>

            <button
              type="submit"
              className="primary-button workspace-submit-button"
              disabled={
                isSaving ||
                duplicateWorkspaceName.trim().length < 2
              }
            >
              {isSaving
                ? "Dupliceren..."
                : "Dupliceren"}
            </button>
          </div>
        </form>
      )}

      {isRenameOpen &&
  activeWorkspace &&
  activeWorkspace.type !== "live" && (
    <form
      className="workspace-create-form"
      onSubmit={(event) =>
        void handleRenameWorkspace(
          event,
        )
      }
    >
      <label>
        <span>Nieuwe naam</span>

        <input
          type="text"
          value={renameWorkspaceName}
          onChange={(event) =>
            setRenameWorkspaceName(
              event.target.value,
            )
          }
          autoFocus
          disabled={isSaving}
        />
      </label>

      <div className="workspace-create-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            if (!isSaving) {
              setIsRenameOpen(false);
              setRenameWorkspaceName("");
              setError(null);
            }
          }}
          disabled={isSaving}
        >
          Annuleren
        </button>

        <button
          type="submit"
          className="primary-button workspace-submit-button"
          disabled={
            isSaving ||
            renameWorkspaceName
              .trim()
              .length < 2
          }
        >
          {isSaving
            ? "Opslaan..."
            : "Opslaan"}
        </button>
      </div>
    </form>
  )}

{isDeleteOpen &&
  activeWorkspace &&
  activeWorkspace.type !== "live" && (
    <div className="quantity-confirm-backdrop">
      <div
        className="quantity-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workspace-title"
      >
        <p className="eyebrow">
          WORKSPACE VERWIJDEREN
        </p>

        <h3 id="delete-workspace-title">
          {activeWorkspace.name} verwijderen?
        </h3>

        <div className="quantity-confirm-warning">
          Deze actie verwijdert de volledige workspace,
          inclusief holdings, instellingen en transacties.
          Dit kan niet ongedaan worden gemaakt.
        </div>

        <div className="quantity-confirm-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setIsDeleteOpen(false)
            }
            disabled={isSaving}
          >
            Annuleren
          </button>

          <button
            type="button"
            className="workspace-delete-confirm-button"
            onClick={() =>
              void handleDeleteWorkspace()
            }
            disabled={isSaving}
          >
            {isSaving
              ? "Verwijderen..."
              : "Definitief verwijderen"}
          </button>
        </div>
      </div>
    </div>
  )}

      {error && (
        <p className="workspace-selector-error">
          {error}
        </p>
      )}
    </div>
  );
}