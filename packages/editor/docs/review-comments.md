# Review comments, discussions, and @mentions

Comments are anchored discussions that are separate from tracked Suggestions.
Users can create and reply in `edit` and `suggest` mode; `view` mode is read-only.
An anchor may be a text range or a collapsed caret. Rectangular table-cell
selections are not supported yet.

## User flow

A user can start a discussion from the **+ Comment** button, the floating comment
action beside a text selection, or `Ctrl+Alt+M` / `Cmd+Option+M`. Submitting the
root comment opens the inline thread beside the document and focuses the same
thread in Review > Comments.

Open threads have a clickable count marker on the document, an always-available
reply composer, and actions allowed by the host: Edit, Delete, Resolve, and
Reopen. Delete creates a `Comment deleted` tombstone so replies and collaboration
history remain intact. Resolved markers are hidden from the document and remain
available through the Review panel's Open, Resolved, and All filters.

The public methods mirror the UI:

```ts
const handle = await editor.whenReady();

handle.startComment();
handle.openCommentThread(threadId);
handle.replyToComment(threadId, body, mentions);
handle.editComment(threadId, commentId, nextBody, nextMentions);
handle.deleteComment(threadId, commentId); // tombstone, not a hard removal
handle.resolveThread(threadId, true);      // false reopens
```

## Always pass the current user

The editor displays an Anonymous fallback for local/demo use. Production hosts
should pass the authenticated identity so authorship, default ownership checks,
presence, and events have a stable user id:

```ts
const editor = new KindyEditor({
  container,
  docId: "doc-42",
  user: {
    id: session.user.id,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
  },
});
```

The browser identity is presentation context, not authentication. The backend
must derive the actor from the authenticated request/session.

## Host-owned mention picker

Pass `mentionPicker` when the host needs to render users from its own directory,
portal, or design system. The editor calls the adapter when the `@query` changes,
aborts the previous request, and inserts the returned `UserInfo` as structured
mention data. The host owns opening, positioning, keyboard behavior, and closing
its picker.

```ts
import type { MentionPicker } from "kindy-editor";

const mentionPicker: MentionPicker = async (request) => {
  const users = await directory.search(request.query, {
    signal: request.signal,
    documentId: request.documentId,
    exclude: request.selectedUserIds,
  });

  return mentionOverlay.choose({
    users,
    anchorRect: request.anchorRect,
    context: request.context,
    signal: request.signal,
  }); // Promise<UserInfo | null>
};

const editor = new KindyEditor({ container, user, mentionPicker });
```

Treat `AbortError` as normal cancellation and close the host overlay when
`request.signal` aborts. If `mentionPicker` is omitted, `knownUsers` and
`setKnownUsers()` drive the built-in fallback picker.

## Capability callback

Use `reviewAccess.can` for both UI visibility and client-side public-method
enforcement:

```ts
const editor = new KindyEditor({
  container,
  user,
  reviewAccess: {
    can(action, context) {
      if (context.mode === "view") return false;
      if (action === "comment.edit" || action === "comment.delete") {
        return context.comment?.author.id === context.actor?.id;
      }
      if (action === "thread.resolve" || action === "thread.reopen") {
        return acl.canManageReview(context.documentId);
      }
      return acl.canComment(context.documentId);
    },
  },
});

// Replace policy after a role/ACL refresh.
await editor.setReviewAccess(nextReviewAccess);
```

Actions are `comment.create`, `comment.reply`, `comment.edit`, `comment.delete`,
`thread.resolve`, and `thread.reopen`. Without a callback, edit/suggest users may
create and reply, authors may edit/delete their own comments, and users who can
edit may resolve/reopen. View mode remains read-only. The server must repeat every
authorization check before accepting a review operation.

## Notifications from public events

The root submission emits both `review.thread.created` and
`review.comment.added`. Replies also emit `review.comment.added` with
`isReply: true`. Edits include the full current mention ids and only the newly
introduced ids, so a notification worker does not re-notify unchanged mentions.

```ts
editor.events.on("review.comment.added", ({ document, data }) => {
  notificationQueue.enqueue({
    documentId: document.id,
    threadId: data.threadId,
    commentId: data.commentId,
    authorId: data.authorId,
    isReply: data.isReply,
    mentionedUserIds: data.mentionedUserIds,
  });
});

editor.events.on("review.comment.edited", ({ document, data }) => {
  for (const mentionedUserId of data.newlyMentionedUserIds) {
    notificationQueue.enqueue({
      documentId: document.id,
      commentId: data.commentId,
      mentionedUserId,
    });
  }
});
```

For durable notification delivery, consume the authoritative backend review log
or transactional outbox. Deduplicate mention notifications with
`documentId + commentId + mentionedUserId`; use a separate stable key for reply
notifications. Never trust the browser-supplied actor or use client events as the
only audit record.

Relevant events are:

- `review.thread.created`
- `review.comment.added`
- `review.comment.edited`
- `review.comment.deleted`
- `review.thread.status.changed`

See [Public events](./public-events.md) for the envelope, privacy controls, and
compatibility rules.
