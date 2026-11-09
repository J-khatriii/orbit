import { useMemo, useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard.jsx";
import { useToast } from "../ui/index.js";
import {
  describeDrop,
  groupByStatus,
  moveBetweenColumns,
  reorderWithinColumn,
  STATUS_KEYS,
} from "../../features/tasks/board.js";
import { TASK_STATUS_LABELS } from "../../features/tasks/constants.js";
import { useMoveTask } from "../../features/tasks/useTaskMutations.js";

const SortableTaskCard = ({ task, locked }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: locked,
  });

  return (
    <li>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        className={`rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <TaskCard task={task} />
      </div>
    </li>
  );
};

const BoardColumn = ({ status, tasks, locked }) => {
  // The list itself is a drop target, so a card can be dropped into an empty column.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={TASK_STATUS_LABELS[status]}
      className="flex w-72 shrink-0 flex-col rounded-card bg-sunken/60 p-3 lg:w-auto lg:min-w-0 lg:flex-1"
    >
      <h3 className="mb-3 flex items-center justify-between text-sm font-medium text-ink">
        <span>{TASK_STATUS_LABELS[status]}</span>
        <span className="text-xs font-normal text-ink-muted">{tasks.length}</span>
      </h3>
      <SortableContext
        items={tasks.map((task) => {
          return task.id;
        })}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          className={`flex min-h-16 flex-1 flex-col gap-2 rounded-control ${
            isOver ? "ring-2 ring-brand-500/40" : ""
          }`}
        >
          {tasks.map((task) => {
            return <SortableTaskCard key={task.id} task={task} locked={locked} />;
          })}
        </ul>
      </SortableContext>
    </section>
  );
};

const TaskBoard = ({ workspaceId, project, tasks, locked }) => {
  const toast = useToast();
  const move = useMoveTask();
  // While dragging, and until the server has answered, we show our own arrangement
  // (dragColumns) instead of the server's, so a dropped card never jumps back.
  const [dragColumns, setDragColumns] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const startColumns = useRef(null);
  const pending = useRef(0);

  const tasksById = useMemo(() => {
    return new Map(
      tasks.map((task) => {
        return [task.id, task];
      }),
    );
  }, [tasks]);
  const serverColumns = useMemo(() => {
    return groupByStatus(tasks);
  }, [tasks]);
  const columns = dragColumns ?? serverColumns;
  const activeTask = activeId ? tasksById.get(activeId) : null;

  const sensors = useSensors(
    // A small movement starts a mouse drag, so plain clicks still work later.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens a short press starts the drag, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Back to what we showed before the drag began (or to the server's, if nothing's pending).
  const restore = () => {
    setDragColumns(pending.current > 0 ? startColumns.current : null);
  };

  const persist = (taskId, place) => {
    pending.current += 1;
    move
      .mutateAsync({ workspaceId, projectId: project.id, taskId, input: place })
      .catch((error) => {
        toast.show(error.message);
      })
      .finally(() => {
        pending.current -= 1;

        // Once nothing is in flight, show what the server says (it has just been refetched).
        if (pending.current === 0) {
          setDragColumns(null);
        }
      });
  };

  const handleDragStart = ({ active }) => {
    startColumns.current = columns;
    setActiveId(active.id);
    setDragColumns(columns);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) {
      return;
    }

    const dragged = active.rect.current.translated;
    const isBelowOver = Boolean(dragged) && dragged.top > over.rect.top + over.rect.height / 2;

    setDragColumns((current) => {
      return moveBetweenColumns(current ?? columns, active.id, over.id, isBelowOver);
    });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);

    if (!over) {
      restore();
      return;
    }

    const finalColumns = reorderWithinColumn(columns, active.id, over.id);
    const place = describeDrop(finalColumns, active.id);
    const origin = describeDrop(startColumns.current, active.id);

    // Dropped back where it started: nothing to save.
    if (place.status === origin.status && place.afterTaskId === origin.afterTaskId) {
      restore();
      return;
    }

    setDragColumns(finalColumns);
    persist(active.id, place);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    restore();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_KEYS.map((status) => {
          const columnTasks = columns[status]
            .map((id) => {
              return tasksById.get(id);
            })
            .filter(Boolean);

          return <BoardColumn key={status} status={status} tasks={columnTasks} locked={locked} />;
        })}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay /> : null}</DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
