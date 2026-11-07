import { useState } from "react";
import { describeActivity } from "../../features/clients/activityText.js";
import { useProjectActivity } from "../../features/projects/useProjects.js";
import { timeAgo } from "../../lib/timeAgo.js";
import { Button, Card, Spinner } from "../ui/index.js";

const PAGE_STEP = 10;

const ProjectActivity = ({ workspaceId, projectId }) => {
  const [pageSize, setPageSize] = useState(PAGE_STEP);
  const feed = useProjectActivity(workspaceId, projectId, pageSize);

  const renderBody = () => {
    if (feed.isPending) {
      return (
        <div role="status" className="flex justify-center py-6 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (feed.isError) {
      return <p className="text-sm text-clay-700">{feed.error.message}</p>;
    }
    if (feed.data.activity.length === 0) {
      return <p className="text-sm text-ink-soft">Nothing has happened here yet.</p>;
    }

    const { activity, meta } = feed.data;

    return (
      <>
        <ul className="divide-y divide-line">
          {activity.map((event) => {
            return (
              <li key={event.id} className="flex gap-3 py-3">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500"
                  aria-hidden="true"
                />
                <div className="min-w-0 text-sm">
                  <p className="text-ink">
                    <span className="font-medium">{event.actor?.name ?? "Someone"}</span>{" "}
                    {describeActivity(event)}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    title={new Date(event.createdAt).toLocaleString()}
                    className="text-xs text-ink-muted"
                  >
                    {timeAgo(event.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
        {meta.total > activity.length && (
          <div className="pt-3">
            <Button
              variant="ghost"
              size="sm"
              loading={feed.isPlaceholderData}
              onClick={() => {
                setPageSize((current) => {
                  return current + PAGE_STEP;
                });
              }}
            >
              Show more
            </Button>
          </div>
        )}
      </>
    );
  };

  return <Card title="Activity">{renderBody()}</Card>;
};

export default ProjectActivity;
