(() => {
  "use strict";

  const authDialog = document.getElementById("auth-dialog");
  const openAuth = document.getElementById("open-auth");
  const cancelAuth = document.getElementById("cancel-auth");
  const joinForm = document.getElementById("join-form");
  const usernameInput = document.getElementById("join-username");
  const authMessage = document.getElementById("auth-message");

  const signedOut = document.getElementById("leaderboard-signed-out");
  const signedIn = document.getElementById("leaderboard-signed-in");
  const usernameDisplay = document.getElementById("leaderboard-username");
  const bestDisplay = document.getElementById("leaderboard-best");
  const deletePlayerButton = document.getElementById("delete-player");
  const leaderboardList = document.getElementById("leaderboard-list");

  const configured =
    window.supabase &&
    window.SNAKE_SUPABASE_URL &&
    window.SNAKE_SUPABASE_ANON_KEY &&
    !window.SNAKE_SUPABASE_URL.startsWith("PASTE_") &&
    !window.SNAKE_SUPABASE_ANON_KEY.startsWith("PASTE_");

  const client = configured
    ? window.supabase.createClient(
        window.SNAKE_SUPABASE_URL,
        window.SNAKE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }
      )
    : null;

  function openJoinDialog() {
    authDialog.hidden = false;
    authMessage.textContent = "";
    usernameInput.value = "";
    setTimeout(() => usernameInput.focus(), 0);
  }

  function closeJoinDialog() {
    authDialog.hidden = true;
    authMessage.textContent = "";
    openAuth?.focus();
  }

  openAuth?.addEventListener("click", openJoinDialog);
  cancelAuth?.addEventListener("click", closeJoinDialog);

  authDialog?.addEventListener("click", event => {
    if (event.target === authDialog) {
      closeJoinDialog();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && authDialog && !authDialog.hidden) {
      closeJoinDialog();
    }
  });

  function renderLeaderboard(entries) {
    leaderboardList.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "No scores yet. Be the first.";
      leaderboardList.appendChild(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement("li");
      row.className = "leaderboard-row";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.username;

      const score = document.createElement("strong");
      score.className = "leaderboard-score";
      score.textContent = entry.best_score;

      row.append(rank, name, score);
      leaderboardList.appendChild(row);
    });
  }

  async function loadLeaderboard() {
    if (!client) {
      leaderboardList.innerHTML =
        '<li class="leaderboard-empty">Connect Supabase to load scores.</li>';
      return;
    }

    const { data, error } = await client
      .from("leaderboard")
      .select("username,best_score")
      .order("best_score", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Leaderboard load failed:", error);
      leaderboardList.innerHTML =
        '<li class="leaderboard-empty">Could not load scores.</li>';
      return;
    }

    renderLeaderboard(data ?? []);
  }

  async function getCurrentSession() {
    if (!client) return null;

    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function getMyProfile(userId) {
    const { data, error } = await client
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function getMyBest(userId) {
    const { data, error } = await client
      .from("leaderboard")
      .select("best_score")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.best_score ?? 0;
  }

  async function refreshPlayerUI() {
    if (!client) {
      signedOut.hidden = false;
      signedIn.hidden = true;
      return;
    }

    try {
      const session = await getCurrentSession();

      if (!session?.user) {
        signedOut.hidden = false;
        signedIn.hidden = true;
        return;
      }

      const profile = await getMyProfile(session.user.id);

      if (!profile) {
        signedOut.hidden = false;
        signedIn.hidden = true;
        return;
      }

      const best = await getMyBest(session.user.id);

      usernameDisplay.textContent = `@${profile.username}`;
      bestDisplay.textContent = best;

      signedOut.hidden = true;
      signedIn.hidden = false;
    } catch (error) {
      console.error("Could not load player:", error);
      signedOut.hidden = false;
      signedIn.hidden = true;
    }
  }

  joinForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!client) {
      authMessage.textContent =
        "Supabase is not connected yet. Add your project URL and public key first.";
      return;
    }

    const username = usernameInput.value.trim();

    if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) {
      authMessage.textContent =
        "Use 3–18 letters, numbers, or underscores.";
      return;
    }

    authMessage.textContent = "Joining...";

    try {
      let session = await getCurrentSession();

      if (!session?.user) {
        const { data, error } = await client.auth.signInAnonymously();

        if (error) throw error;
        session = data.session;
      }

      const existingProfile = await getMyProfile(session.user.id);

      if (existingProfile) {
        authMessage.textContent =
          `This browser is already joined as @${existingProfile.username}.`;
        await refreshPlayerUI();
        return;
      }

      const { error: insertError } = await client
        .from("profiles")
        .insert({
          id: session.user.id,
          username
        });

      if (insertError) {
        // username already taken

        if (insertError.code === "23505") {
          authMessage.textContent =
            "That username is already taken. Try another.";
          return;
        }

        throw insertError;
      }

      closeJoinDialog();
      await refreshPlayerUI();
      await loadLeaderboard();
    } catch (error) {
      console.error("Join failed:", error);
      authMessage.textContent =
        "Could not create your player. Check the Supabase setup.";
    }
  });

  async function submitBestScore(score) {
    if (!client || !Number.isInteger(score) || score < 0) return;

    try {
      const session = await getCurrentSession();
      if (!session?.user) return;

      const profile = await getMyProfile(session.user.id);
      if (!profile) return;

      const currentBest = await getMyBest(session.user.id);
      if (score <= currentBest) return;

      const { error } = await client
        .from("leaderboard")
        .upsert(
          {
            user_id: session.user.id,
            username: profile.username,
            best_score: score,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: "user_id"
          }
        );

      if (error) throw error;

      bestDisplay.textContent = score;
      await loadLeaderboard();
    } catch (error) {
      console.error("Score save failed:", error);
    }
  }

  window.addEventListener("snake:gameover", event => {
    submitBestScore(Number(event.detail?.score));
  });

deletePlayerButton?.addEventListener("click", async () => {
  if (!client) return;

  const session = await getCurrentSession();

  if (!session?.user) return;

  const confirmed = window.confirm(
    "Delete your username and score from the leaderboard? This cannot be undone."
  );

  if (!confirmed) return;

  try {
    const userId = session.user.id;

    // delete score first
    const { error: scoreError } = await client
      .from("leaderboard")
      .delete()
      .eq("user_id", userId);

    if (scoreError) {
      throw scoreError;
    }

    // delete user/profile
    const { error: profileError } = await client
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    // forget anon player locally
    await client.auth.signOut();

    await refreshPlayerUI();
    await loadLeaderboard();

  } catch (error) {
    console.error(
      "Could not delete leaderboard profile:",
      error
    );
  }
});


  if (client) {
    client.auth.onAuthStateChange(() => {
      setTimeout(refreshPlayerUI, 0);
    });

    (async () => {
      await refreshPlayerUI();
      await loadLeaderboard();
    })();
  } else {
    leaderboardList.innerHTML =
      '<li class="leaderboard-empty">Connect Supabase to load scores.</li>';
  }
})();
