import { createClient } from '@supabase/supabase-js';

export function initBlogInteractions() {
const SUPABASE_URL = "https://oqyfvvwplvbmmursbpkd.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fA9X_kf1Fz_DNDXa1I97Sg_RKXCojsd";
  const REACTION_TABLE = "apokolips_blog_reactions";
  const COMMENT_TABLE = "apokolips_blog_comments";
  const NOTIFICATIONS_TABLE = "apokolips_blog_notifications";
  const PUSH_SUBSCRIPTIONS_TABLE = "apokolips_blog_push_subscriptions";
  const PUSH_FUNCTION_URL = SUPABASE_URL + "/functions/v1/apokolips-blog-push";
  const REACTIONS = [
    { type: "like", label: "👍 Like" },
    { type: "love", label: "❤️ Love" },
    { type: "wow", label: "😍 Wow" },
    { type: "fire", label: "🔥 Fire" }
  ];
  const visitorStorageKey = "apokolips-blog-visitor-v1";
  const deviceNameStorageKey = "apokolips-blog-device-name-v1";
  const safeStorageGet = key => { try { return window.localStorage.getItem(key); } catch (_) { return null; } };
  const safeStorageSet = (key, value) => { try { window.localStorage.setItem(key, value); } catch (_) {} };
  let deviceDisplayName = safeStorageGet(deviceNameStorageKey) || "";
  let visitorId = safeStorageGet(visitorStorageKey);
  if (!visitorId) {
    visitorId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === "x" ? r : (r & 3 | 8)).toString(16);
        });
    safeStorageSet(visitorStorageKey, visitorId);
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { "x-blog-visitor": visitorId } }
  });
  const cards = new Map();
  const notificationButton = document.getElementById("enableBlogNotifications");
  const notificationBell = document.getElementById("blogNotificationBell");
  const notificationPanel = document.getElementById("blogNotificationPanel");
  const notificationList = document.getElementById("blogNotificationList");
  const notificationStatus = document.getElementById("blogNotificationStatus");
  const unreadCount = document.getElementById("blogUnreadCount");

  function setNotificationStatus(message, isError = false) {
    if (!notificationStatus) return;
    notificationStatus.textContent = message;
    notificationStatus.style.color = isError ? "#ff9b9b" : "#91a8c2";
  }

  function decodeVapidKey(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function enableBlogPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setNotificationStatus("This browser does not support web push notifications.", true);
      return;
    }
    notificationButton.disabled = true;
    notificationButton.textContent = "Setting up…";
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const configResponse = await fetch(PUSH_FUNCTION_URL, {
        method: "GET",
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
      });
      const config = await configResponse.json();
      if (!configResponse.ok || !config.publicKey) throw new Error(config.error || "Push service is not configured yet.");
      const registration = await navigator.serviceWorker.register(new URL("./blog-sw.js", window.location.href));
      const readyRegistration = await navigator.serviceWorker.ready;
      const pushManager = readyRegistration.pushManager || registration.pushManager;
      let subscription = await pushManager.getSubscription();
      if (!subscription) {
        subscription = await pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(config.publicKey)
        });
      }
      const details = subscription.toJSON();
      const { error } = await supabaseClient.from(PUSH_SUBSCRIPTIONS_TABLE).upsert({
        visitor_id: visitorId,
        endpoint: subscription.endpoint,
        p256dh: details.keys?.p256dh,
        auth: details.keys?.auth,
        user_agent: navigator.userAgent
      }, { onConflict: "endpoint" });
      if (error) throw error;
      notificationButton.textContent = "Notifications enabled";
      setNotificationStatus("Notifications are enabled on this browser.");
      hideNotificationButtons();
    } catch (error) {
      console.error("Blog push setup failed:", error);
      notificationButton.textContent = "Enable notifications";
      setNotificationStatus(error.message || "Could not enable notifications.", true);
    } finally {
      notificationButton.disabled = false;
    }
  }

  function hideNotificationButtons() {
    if (notificationButton) notificationButton.hidden = true;
    if (notificationBell) notificationBell.hidden = true;
    if (notificationPanel) notificationPanel.hidden = true;
  }

  async function syncNotificationButtons() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration(new URL("./blog-sw.js", window.location.href).pathname);
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) return;
      const { data, error } = await supabaseClient.from(PUSH_SUBSCRIPTIONS_TABLE)
        .select("id")
        .eq("visitor_id", visitorId)
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        hideNotificationButtons();
        setNotificationStatus("Notifications are enabled on this browser.");
      }
    } catch (error) {
      console.warn("Could not verify saved blog push permission:", error);
    }
  }

  async function loadBlogNotifications() {
    const { data, error } = await supabaseClient.from(NOTIFICATIONS_TABLE)
      .select("id,title,body,target_url,created_at,read_at")
      .eq("recipient_visitor_id", visitorId)
      .order("created_at", { ascending: false }).limit(30);
    if (error) {
      console.warn("Could not load blog notifications:", error);
      return;
    }
    const notifications = data || [];
    const unread = notifications.filter(item => !item.read_at).length;
    unreadCount.textContent = String(unread);
    notificationList.replaceChildren();
    if (!notifications.length) {
      const empty = document.createElement("p");
      empty.className = "interaction-note";
      empty.textContent = "No notifications yet.";
      notificationList.append(empty);
      return;
    }
    notifications.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "blog-notification-item";
      button.textContent = item.title;
      const body = document.createElement("span");
      body.textContent = item.body;
      const time = document.createElement("small");
      time.textContent = new Date(item.created_at).toLocaleString() + (item.read_at ? "" : " · New");
      button.append(body, time);
      button.addEventListener("click", async () => {
        if (!item.read_at) {
          await supabaseClient.from(NOTIFICATIONS_TABLE)
            .update({ read_at: new Date().toISOString() }).eq("id", item.id);
        }
        window.location.href = item.target_url || "/blog.html#memories";
      });
      notificationList.append(button);
    });
  }

  if (notificationButton) notificationButton.addEventListener("click", enableBlogPush);
  syncNotificationButtons();
  if (notificationBell) notificationBell.addEventListener("click", async () => {
    const opening = notificationPanel.hidden;
    notificationPanel.hidden = !opening;
    notificationBell.setAttribute("aria-expanded", String(opening));
    if (opening) await loadBlogNotifications();
  });


  function slugify(value) {
    return String(value || "").toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "travel-memory";
  }

  function getCardSlug(card) {
    if (card.dataset.postSlug) return slugify(card.dataset.postSlug);
    const media = card.querySelector("img, video");
    const source = media ? (media.currentSrc || media.src || media.getAttribute("src")) : "";
    const filename = source.split("/").pop().split("?")[0].replace(/%[0-9a-f]{2}/ig, "");
    const base = filename.replace(/\.[a-z0-9]{2,5}$/i, "");
    return slugify(card.id || base || "travel-memory");
  }

  function makeButton(type, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reaction-button";
    button.dataset.reaction = type;
    button.setAttribute("aria-pressed", "false");
    button.append(document.createTextNode(label + " "));
    const count = document.createElement("span");
    count.className = "reaction-number";
    count.textContent = "0";
    button.append(count);
    return button;
  }

  function enhanceCard(card) {
    if (card.dataset.socialReady === "true") return;
    const content = card.querySelector(".post-content, .media-caption");
    if (!content) return;
    card.dataset.socialReady = "true";

    const slug = getCardSlug(card);
    card.dataset.postSlug = slug;
    if (!card.id) card.id = "travel-" + slug;

    content.querySelectorAll(".post-actions, .comments, .interaction-note, #interactionStatus").forEach(el => el.remove());

    const actions = document.createElement("div");
    actions.className = "post-actions";
    actions.setAttribute("aria-label", "React to this media");
    REACTIONS.forEach(item => actions.append(makeButton(item.type, item.label)));

    const total = document.createElement("span");
    total.className = "reaction-count";
    total.textContent = "0 reactions";
    actions.append(total);

    const share = document.createElement("button");
    share.type = "button";
    share.className = "share-media-button";
    share.textContent = "↗ Share";
    share.setAttribute("aria-label", "Share this photo or video");
    actions.append(share);

    const comments = document.createElement("section");
    comments.className = "comments";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "comments-toggle";
    toggle.setAttribute("aria-expanded", "false");
    const toggleLabel = document.createElement("span");
    toggleLabel.textContent = "Comments";
    const commentCount = document.createElement("span");
    commentCount.className = "comment-toggle-count";
    commentCount.textContent = "0 comments  ▾";
    toggle.append(toggleLabel, commentCount);

    const panel = document.createElement("div");
    panel.className = "comments-panel";
    panel.hidden = true;
    toggle.addEventListener("click", () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      toggle.setAttribute("aria-expanded", String(opening));
      commentCount.textContent = stateCountLabel(state.commentTotal, opening);
    });

    const form = document.createElement("form");
    form.className = "comment-form";
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 40;
    name.placeholder = "Your name";
    name.setAttribute("aria-label", "Your name");
    name.required = true;
    if (deviceDisplayName) {
      name.value = deviceDisplayName;
      name.readOnly = true;
      name.title = "This name is locked on this device";
    }
    const message = document.createElement("textarea");
    message.maxLength = 500;
    message.placeholder = "Write a comment...";
    message.setAttribute("aria-label", "Write a comment");
    message.required = true;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Post comment";
    form.append(name, message, submit);

    const list = document.createElement("div");
    list.className = "comment-list";
    list.setAttribute("aria-live", "polite");
    const note = document.createElement("p");
    note.className = "interaction-note";
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
    note.textContent = "Loading shared reactions and comments…";
    const nameHint = document.createElement("p");
    nameHint.className = "device-name-hint";
    nameHint.textContent = "Your first comment or reply locks this name on this browser/device.";
    panel.append(form, nameHint, list, note);
    comments.append(toggle, panel);
    content.append(actions, comments);

    const state = { card, slug, actions, comments, toggle, panel, form, name, message, submit, list, note, commentCount, commentTotal: 0, selected: null };
    cards.set(slug, state);

    actions.addEventListener("click", async event => {
      const reactionButton = event.target.closest("button[data-reaction]");
      if (reactionButton) {
        await saveReaction(state, reactionButton.dataset.reaction);
        return;
      }
      if (event.target.closest(".share-media-button")) {
        const title = card.querySelector(".post-title, h3")?.textContent?.trim() || "Travel memory";
        const url = window.location.origin + window.location.pathname + "#" + card.id;
        const shareData = { title: title + " | Apokolips", text: "Check out this travel memory on Apokolips.", url };
        try {
          if (navigator.share) await navigator.share(shareData);
          else if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            note.textContent = "Link copied. Share it with your friends.";
          } else {
            window.prompt("Copy this link to share:", url);
          }
        } catch (error) {
          if (error?.name !== "AbortError") window.prompt("Copy this link to share:", url);
        }
      }
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      await restoreDeviceName();
      const displayName = (deviceDisplayName || name.value).trim().slice(0, 40);
      const body = message.value.trim().slice(0, 500);
      if (!displayName || !body) return;
      submit.disabled = true;
      submit.textContent = "Posting…";
      try {
        const { error } = await supabaseClient.from(COMMENT_TABLE).insert({
          post_slug: slug, visitor_id: visitorId, display_name: displayName, body
        });
        if (error) throw error;
        lockDeviceName(displayName);
        message.value = "";
        await loadComments(state);
        setNote(state, "Your comment is now visible to other visitors.");
      } catch (error) {
        console.error("Comment save failed:", error);
        setNote(state, "Comment could not be posted. Please try again.", true);
      } finally {
        submit.disabled = false;
        submit.textContent = "Post comment";
      }
    });
    refreshCard(state);
  }

  function setNote(state, message, isError = false) {
    state.note.textContent = message;
    state.note.style.color = isError ? "#ff9b9b" : "#829bb8";
  }

  async function loadReactions(state) {
    const { data, error } = await supabaseClient
      .from(REACTION_TABLE).select("reaction,visitor_id").eq("post_slug", state.slug);
    if (error) throw error;
    const counts = Object.fromEntries(REACTIONS.map(item => [item.type, 0]));
    state.selected = null;
    (data || []).forEach(row => {
      if (counts[row.reaction] !== undefined) counts[row.reaction]++;
      if (row.visitor_id === visitorId) state.selected = row.reaction;
    });
    let total = 0;
    REACTIONS.forEach(item => {
      const button = state.actions.querySelector('[data-reaction="' + item.type + '"]');
      const count = counts[item.type];
      total += count;
      button.querySelector(".reaction-number").textContent = count;
      const selected = state.selected === item.type;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    state.actions.querySelector(".reaction-count").textContent = total + (total === 1 ? " reaction" : " reactions");
  }

  function stateCountLabel(count, isOpen) {
    return count + (count === 1 ? " comment" : " comments") + (isOpen ? "  ▴" : "  ▾");
  }

  function lockDeviceName(name) {
    if (!name || deviceDisplayName) return;
    deviceDisplayName = name.trim().slice(0, 40);
    if (!deviceDisplayName) return;
    safeStorageSet(deviceNameStorageKey, deviceDisplayName);
    cards.forEach(cardState => {
      cardState.name.value = deviceDisplayName;
      cardState.name.readOnly = true;
      cardState.name.title = "This name is locked on this device";
    });
  }

  async function restoreDeviceName() {
    if (deviceDisplayName) return;
    try {
      const { data, error } = await supabaseClient.from(COMMENT_TABLE)
        .select("display_name").eq("visitor_id", visitorId)
        .order("created_at", { ascending: true }).limit(1);
      if (!error && data && data.length) lockDeviceName(data[0].display_name);
    } catch (error) {
      console.warn("Could not restore this device's comment name:", error);
    }
  }

  function renderComment(comment, replies, state, isReply = false) {
    const item = document.createElement("article");
    item.className = "comment-item" + (isReply ? " comment-reply" : "");
    item.id = "comment-" + comment.id;
    const author = document.createElement("strong");
    author.textContent = comment.display_name;
    const body = document.createElement("p");
    body.textContent = comment.body;
    const time = document.createElement("small");
    time.textContent = new Date(comment.created_at).toLocaleString();
    time.style.color = "#71849c";
    item.append(author, body, time);

    if (!isReply) {
      const replyButton = document.createElement("button");
      replyButton.type = "button";
      replyButton.className = "comment-reply-button";
      replyButton.textContent = "↳ Reply";
      item.append(replyButton);

      const replyForm = document.createElement("form");
      replyForm.className = "reply-form";
      replyForm.hidden = true;
      const replyText = document.createElement("textarea");
      replyText.maxLength = 500;
      replyText.placeholder = "Write a reply…";
      replyText.required = true;
      const sendReply = document.createElement("button");
      sendReply.type = "submit";
      sendReply.textContent = "Post reply";
      replyForm.append(replyText, sendReply);
      replyButton.addEventListener("click", () => {
        replyForm.hidden = !replyForm.hidden;
        if (!replyForm.hidden) replyText.focus();
      });
      replyForm.addEventListener("submit", async event => {
        event.preventDefault();
        await restoreDeviceName();
        const displayName = deviceDisplayName || state.name.value.trim().slice(0, 40);
        const replyBody = replyText.value.trim().slice(0, 500);
        if (!displayName || !replyBody) {
          setNote(state, "Enter your name in the comment form first.", true);
          state.name.focus();
          return;
        }
        sendReply.disabled = true;
        sendReply.textContent = "Posting…";
        try {
          const { error } = await supabaseClient.from(COMMENT_TABLE).insert({
            post_slug: state.slug, visitor_id: visitorId,
            display_name: displayName, body: replyBody, parent_comment_id: comment.id
          });
          if (error) throw error;
          lockDeviceName(displayName);
          replyText.value = "";
          replyForm.hidden = true;
          await loadComments(state);
          setNote(state, "Your reply has been shared.");
        } catch (error) {
          console.error("Reply save failed:", error);
          setNote(state, "Reply could not be posted. Please try again.", true);
        } finally {
          sendReply.disabled = false;
          sendReply.textContent = "Post reply";
        }
      });
      item.append(replyForm);

      if (replies.length) {
        const replyList = document.createElement("div");
        replyList.className = "comment-replies";
        replies.forEach(reply => replyList.append(renderComment(reply, [], state, true)));
        item.append(replyList);
      }
    }
    return item;
  }

  async function loadComments(state) {
    const { data, error } = await supabaseClient
      .from(COMMENT_TABLE).select("id,parent_comment_id,display_name,body,created_at")
      .eq("post_slug", state.slug).order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    const comments = data || [];
    const repliesByParent = new Map();
    comments.filter(comment => comment.parent_comment_id).forEach(reply => {
      const group = repliesByParent.get(reply.parent_comment_id) || [];
      group.push(reply);
      repliesByParent.set(reply.parent_comment_id, group);
    });
    state.list.replaceChildren();
    comments.filter(comment => !comment.parent_comment_id).forEach(comment => {
      state.list.append(renderComment(comment, repliesByParent.get(comment.id) || [], state));
    });
    state.commentTotal = comments.length;
    state.commentCount.textContent = stateCountLabel(state.commentTotal, !state.panel.hidden);
  }

  async function refreshCard(state) {
    try {
      await Promise.all([loadReactions(state), loadComments(state)]);
      setNote(state, "Live: reactions and comments are shared with everyone.");
    } catch (error) {
      console.error("Could not load social data for " + state.slug, error);
      setNote(state, "Could not load shared activity. Refresh the page and try again.", true);
    }
  }

  async function saveReaction(state, type) {
    if (state.selected === type) return;
    state.actions.querySelectorAll("button").forEach(button => button.disabled = true);
    try {
      const { data: updated, error: updateError } = await supabaseClient
        .from(REACTION_TABLE).update({ reaction: type })
        .eq("post_slug", state.slug).eq("visitor_id", visitorId).select("id");
      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabaseClient.from(REACTION_TABLE).insert({
          post_slug: state.slug, visitor_id: visitorId, reaction: type
        });
        if (insertError && insertError.code === "23505") {
          const { error: retryError } = await supabaseClient.from(REACTION_TABLE)
            .update({ reaction: type }).eq("post_slug", state.slug).eq("visitor_id", visitorId);
          if (retryError) throw retryError;
        } else if (insertError) {
          throw insertError;
        }
      }
      await loadReactions(state);
      setNote(state, "Your reaction has been shared.");
    } catch (error) {
      console.error("Reaction save failed for " + state.slug, error);
      setNote(state, "Your reaction could not be saved. Please try again.", true);
    } finally {
      state.actions.querySelectorAll("button").forEach(button => button.disabled = false);
    }
  }

  function enhanceAll(root = document) {
    root.querySelectorAll(".photo-post, .media-card").forEach(enhanceCard);
  }

  enhanceAll();
  restoreDeviceName();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("./blog-sw.js", window.location.href)).catch(error => console.warn("Blog service worker registration failed:", error));
  }
  loadBlogNotifications();
  const notificationsChannel = supabaseClient.channel("apokolips-blog-notifications-" + visitorId)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: NOTIFICATIONS_TABLE,
      filter: "recipient_visitor_id=eq." + visitorId
    }, () => loadBlogNotifications())
    .subscribe();
  const mediaRoot = document.getElementById("memories") || document.body;
  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.matches?.(".photo-post, .media-card")) enhanceCard(node);
        enhanceAll(node);
      }
    }));
  });
  observer.observe(mediaRoot, { childList: true, subtree: true });

  const socialChannel = supabaseClient.channel("apokolips-blog-all-media")
    .on("postgres_changes", { event: "*", schema: "public", table: REACTION_TABLE }, payload => {
      cards.forEach(state => { if (!payload.new?.post_slug || payload.new.post_slug === state.slug || payload.old?.post_slug === state.slug) loadReactions(state).catch(console.error); });
    })
    .on("postgres_changes", { event: "*", schema: "public", table: COMMENT_TABLE }, payload => {
      cards.forEach(state => { if (!payload.new?.post_slug || payload.new.post_slug === state.slug || payload.old?.post_slug === state.slug) loadComments(state).catch(console.error); });
    })
    .subscribe();
  return () => {
    observer.disconnect();
    supabaseClient.removeChannel(notificationsChannel);
    supabaseClient.removeChannel(socialChannel);
  };
}
