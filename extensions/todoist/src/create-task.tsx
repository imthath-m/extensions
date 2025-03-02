import { useState } from "react";
import { ActionPanel, Form, Icon, showToast, useNavigation, open, Toast, Action } from "@raycast/api";
import { AddTaskArgs } from "@doist/todoist-api-typescript";
import useSWR from "swr";
import { handleError, todoist } from "./api";
import { priorities } from "./constants";
import { getAPIDate } from "./utils";
import Project from "./components/Project";
import { SWRKeys } from "./types";

export default function CreateTask() {
  const { push } = useNavigation();
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get projects" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  const isLoading = !projects || !labels;

  const lowestPriority = priorities[priorities.length - 1];

  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<string>(String(lowestPriority.value));
  const [projectId, setProjectId] = useState<string>();
  const [labelIds, setLabelIds] = useState<string[]>();

  function clear() {
    setContent("");
    setDescription("");
    setDueDate(undefined);
    setPriority(String(lowestPriority.value));
  }

  async function submit() {
    const body: AddTaskArgs = { content, description };

    if (!body.content) {
      await showToast({ style: Toast.Style.Failure, title: "The title is required" });
      return;
    }

    if (dueDate) {
      body.dueDate = getAPIDate(dueDate);
    }

    if (priority) {
      body.priority = parseInt(priority);
    }

    if (projectId) {
      body.projectId = parseInt(projectId);
    }

    if (labelIds && labelIds.length > 0) {
      body.labelIds = labelIds.map((id) => parseInt(id));
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
    await toast.show();

    try {
      const { projectId, url } = await todoist.addTask(body);
      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.primaryAction = {
        title: "Go to project",
        shortcut: { modifiers: ["cmd"], key: "g" },
        onAction: () => push(<Project projectId={projectId} />),
      };
      toast.secondaryAction = {
        title: "Open in browser",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => open(url),
      };
      clear();
    } catch (error) {
      handleError({ error, title: "Unable to create task" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create task" onSubmit={submit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="Title" placeholder="Buy fruits" value={content} onChange={setContent} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Apples, pears, and **strawberries**"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.DatePicker id="due_date" title="Due date" value={dueDate} onChange={setDueDate} />

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        {priorities.map(({ value, name }) => (
          <Form.Dropdown.Item value={String(value)} title={name} key={value} />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown id="project_id" title="Project" value={projectId} onChange={setProjectId} storeValue>
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}

      {labels && labels.length > 0 ? (
        <Form.TagPicker id="label_ids" title="Labels" value={labelIds} onChange={setLabelIds} storeValue>
          {labels.map(({ id, name }) => (
            <Form.TagPicker.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.TagPicker>
      ) : null}
    </Form>
  );
}
