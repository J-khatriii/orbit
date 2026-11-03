import * as contactService from "../services/contact.service.js";

// req.workspace comes from workspaceContext, req.user from requireAuth,
// and clientId from the URL (see mergeParams in the routes file).
export const listContacts = async (req, res) => {
  const contacts = await contactService.listContacts(req.workspace.id, req.params.clientId);

  res.json({ contacts });
};

export const createContact = async (req, res) => {
  const contact = await contactService.createContact({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    input: req.validated.body,
  });

  res.status(201).json({ contact });
};

export const updateContact = async (req, res) => {
  const contact = await contactService.updateContact({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    contactId: req.params.contactId,
    input: req.validated.body,
  });

  res.json({ contact });
};

export const deleteContact = async (req, res) => {
  await contactService.deleteContact({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    contactId: req.params.contactId,
  });

  res.status(204).end();
};
