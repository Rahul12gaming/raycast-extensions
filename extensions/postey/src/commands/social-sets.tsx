import { Action, ActionPanel, Icon, Image, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { listSocialSets } from "../lib/api";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY } from "../lib/constants";
import { CreateDraftForm } from "./create-draft";
import { DraftsList } from "./drafts";
import { getPreferences } from "../lib/preferences";
import type { SocialSetListItem } from "../lib/types";
import { getErrorMessage } from "../lib/utils";

function getSocialSetUsername(socialSet: SocialSetListItem) {
  return (
    socialSet.twitter?.username ||
    socialSet.linkedin?.vanity_name ||
    socialSet.instagram?.username ||
    socialSet.tiktok?.username ||
    socialSet.account_owner
  );
}

function getSocialSetImage(socialSet: SocialSetListItem) {
  return (
    socialSet.twitter?.profile_image_url ||
    socialSet.linkedin?.profile_image_url ||
    socialSet.instagram?.profile_image_url ||
    socialSet.tiktok?.avatar_url ||
    ""
  );
}

export function SocialSetsList() {
  const [defaultSocialSetId, setDefaultSocialSetId] = useCachedState<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const { data: socialSets, isLoading, error, revalidate } = usePromise(listSocialSets, []);
  const items = socialSets ?? [];
  const showEmptyState = !isLoading && !error && items.length === 0;
  const grouped = useMemo(() => {
    const noTeam = items.filter((item) => !item.teams || item.teams.length === 0);
    const withTeam = items.filter((item) => item.teams && item.teams.length > 0);
    return { noTeam, withTeam };
  }, [items]);

  const emptyView = error ? (
    <List.EmptyView
      title="Unable to load social sets"
      description={getErrorMessage(error)}
      icon={Icon.Warning}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : showEmptyState ? (
    <List.EmptyView
      title="No social sets"
      description="Create a social set in Postey to get started."
      icon={Icon.Switch}
    />
  ) : null;

  const renderSocialSetItem = (socialSet: SocialSetListItem) => {
    const username = getSocialSetUsername(socialSet);
    const isDefault = defaultSocialSetId === String(socialSet.account_id);
    const accessories: List.Item.Accessory[] = [];
    if (isDefault) {
      accessories.push({ text: "Default", icon: Icon.CheckCircle });
    }
    const profileImage = getSocialSetImage(socialSet);
    const icon = profileImage ? { source: profileImage, mask: Image.Mask.Circle } : Icon.Person;

    return (
      <List.Item
        key={socialSet.account_id}
        title={socialSet.account_name}
        subtitle={`@${username}`}
        icon={icon}
        accessories={accessories}
        keywords={[username]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Create Draft Here"
                icon={Icon.Pencil}
                target={<CreateDraftForm socialSetId={String(socialSet.account_id)} />}
              />
              <Action.Push
                title="View Drafts Here"
                icon={Icon.List}
                target={<DraftsList socialSetId={String(socialSet.account_id)} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Set as Default"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  setDefaultSocialSetId(String(socialSet.account_id));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Default social set updated",
                    message: `${socialSet.account_name} (@${username})`,
                  });
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search social sets">
      {emptyView}
      {grouped.noTeam.length > 0 ? (
        <List.Section title="Personal" subtitle={String(grouped.noTeam.length)}>
          {grouped.noTeam.map(renderSocialSetItem)}
        </List.Section>
      ) : null}
      {grouped.withTeam.length > 0 ? (
        <List.Section title="Team Accounts" subtitle={String(grouped.withTeam.length)}>
          {grouped.withTeam.map(renderSocialSetItem)}
        </List.Section>
      ) : null}
    </List>
  );
}

export default function Command() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    return <ApiKeyRequiredView />;
  }
  return <SocialSetsList />;
}
