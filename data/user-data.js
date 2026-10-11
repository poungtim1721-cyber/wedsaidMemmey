(function () {
  const HISTORY_TABLE = "reading_history";
  const FAVORITES_TABLE = "user_favorites";
  const VOCAB_TABLE = "user_saved_vocab";
  const FAVORITES_KEY = "favoriteManga";
  const VOCAB_KEY = "favoriteVocab";

  function getClient() {
    if (typeof window.getSupabaseClient !== "function") {
      throw new Error("Supabase client is not configured.");
    }
    return window.getSupabaseClient();
  }

  async function getContext() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new Error(`Could not read the Supabase session: ${error.message}`);
    }
    return { client, user: data.session ? data.session.user : null };
  }

  function toDatabaseRecord(record, userId) {
    if (!record || !record.sessionId || !record.title || !record.date) {
      throw new Error("Reading history record is missing a session ID, title, or date.");
    }
    const date = new Date(record.date);
    if (!Number.isFinite(date.getTime())) {
      throw new Error("Reading history record has an invalid date.");
    }

    return {
      user_id: userId,
      session_id: String(record.sessionId),
      type: record.type === "vocabulary" ? "vocabulary" : "manga",
      title: String(record.title),
      manga_id: record.mangaId ? String(record.mangaId) : null,
      chapter: record.chapter ? String(record.chapter) : "",
      page_number: Number.isFinite(Number(record.page)) ? Math.max(0, Number(record.page)) : 0,
      total_pages: Number.isFinite(Number(record.totalPages)) ? Math.max(0, Number(record.totalPages)) : 0,
      duration_seconds: Number.isFinite(Number(record.durationSeconds))
        ? Math.max(0, Math.floor(Number(record.durationSeconds)))
        : 0,
      read_at: date.toISOString()
    };
  }

  function fromDatabaseRecord(record) {
    return {
      userId: record.user_id,
      sessionId: record.session_id,
      type: record.type,
      title: record.title,
      mangaId: record.manga_id || "",
      chapter: record.chapter || "",
      page: record.page_number || 0,
      totalPages: record.total_pages || 0,
      durationSeconds: record.duration_seconds || 0,
      date: record.read_at
    };
  }

  async function saveRecords(client, records, userId) {
    const validRecords = records.filter(function (record) {
      return record && record.sessionId && record.title && record.date;
    });
    if (validRecords.length === 0) return;

    const rows = validRecords.map(function (record) {
      return toDatabaseRecord(record, userId);
    });
    const batchSize = 100;
    for (let start = 0; start < rows.length; start += batchSize) {
      const { error } = await client
        .from(HISTORY_TABLE)
        .upsert(rows.slice(start, start + batchSize), { onConflict: "user_id,session_id" });
      if (error) {
        throw new Error(`Could not sync reading history: ${error.message}`);
      }
    }
  }

  function getDate(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  function favoriteKey(record) {
    return String(record.mangaId || record.href || "");
  }

  function vocabKey(record) {
    return String(record.word || "") + "\u0000" + String(record.level || "");
  }

  function toFavoriteRow(record, userId) {
    const mangaId = favoriteKey(record);
    if (!mangaId || !record.title) {
      throw new Error("Favorite record is missing a manga ID or title.");
    }
    return {
      auth_user_id: userId,
      manga_id: mangaId,
      title: String(record.title),
      href: String(record.href || ""),
      image: String(record.image || ""),
      note: String(record.note || ""),
      category: String(record.category || record.type || "ทั่วไป"),
      type: String(record.type || "manga"),
      created_at: getDate(record.date)
    };
  }

  function fromFavoriteRow(record) {
    return {
      mangaId: record.manga_id,
      title: record.title,
      href: record.href || "",
      image: record.image || "",
      note: record.note || "",
      category: record.category || "ทั่วไป",
      type: record.type || "manga",
      date: record.created_at
    };
  }

  function toVocabRow(record, userId) {
    if (!record || !record.word) {
      throw new Error("Saved vocabulary record is missing a word.");
    }
    return {
      auth_user_id: userId,
      kanji: String(record.word),
      kana: String(record.reading || ""),
      word: String(record.word),
      level: String(record.level || ""),
      reading: String(record.reading || ""),
      meaning: String(record.meaning || ""),
      meaning_th: String(record.meaningTh || ""),
      created_at: getDate(record.date)
    };
  }

  function fromVocabRow(record) {
    return {
      word: record.word,
      reading: record.reading || "",
      meaning: record.meaning || "",
      meaningTh: record.meaning_th || "",
      level: record.level || "",
      date: record.created_at
    };
  }

  async function upsertUserRows(client, table, rows, conflictColumns, description) {
    const batchSize = 100;
    for (let start = 0; start < rows.length; start += batchSize) {
      const { error } = await client
        .from(table)
        .upsert(rows.slice(start, start + batchSize), { onConflict: conflictColumns });
      if (error) {
        throw new Error(`Could not sync ${description}: ${error.message}`);
      }
    }
  }

  function uniqueRecords(records, keyForRecord) {
    const unique = new Map();
    records.forEach(function (record) {
      const key = keyForRecord(record);
      if (key) unique.set(key, record);
    });
    return Array.from(unique.values());
  }

  async function loadUserRecords(options) {
    const { client, user } = await getContext();
    const localRecords = Array.isArray(options.localRecords) ? options.localRecords : [];
    if (!user) return { user: null, records: localRecords };

    const migrationKey = options.migrationKey + ":" + user.id;
    if (localStorage.getItem(migrationKey) !== "true") {
      const cachedOwner = localStorage.getItem(options.ownerKey);
      const recordsToImport = !cachedOwner || cachedOwner === user.id ? localRecords : [];
      const rows = uniqueRecords(recordsToImport, options.keyForRecord)
        .map(function (record) { return options.toRow(record, user.id); });
      await upsertUserRows(
        client,
        options.table,
        rows,
        options.conflictColumns,
        options.description
      );
      localStorage.setItem(migrationKey, "true");
    }

    let query = client
      .from(options.table)
      .select(options.columns)
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false });
    if (options.orderColumn) query = query.order(options.orderColumn, { ascending: false });
    const { data, error } = await query;
    if (error) {
      throw new Error(`Could not load ${options.description}: ${error.message}`);
    }
    const records = data.map(options.fromRow);
    localStorage.setItem(options.localStorageKey, JSON.stringify(records));
    localStorage.setItem(options.ownerKey, user.id);
    return { user: user, records: records };
  }

  async function saveUserRecord(options) {
    const { client, user } = await getContext();
    if (!user) return false;
    const row = options.toRow(options.record, user.id);
    const { error } = await client
      .from(options.table)
      .upsert(row, { onConflict: options.conflictColumns });
    if (error) {
      throw new Error(`Could not save ${options.description}: ${error.message}`);
    }
    return true;
  }

  async function deleteUserRecord(options) {
    const { client, user } = await getContext();
    if (!user) return false;
    let request = client
      .from(options.table)
      .delete()
      .eq("auth_user_id", user.id);
    options.matchColumns.forEach(function (match) {
      request = request.eq(match.column, match.value);
    });
    const { error } = await request;
    if (error) {
      throw new Error(`Could not delete ${options.description}: ${error.message}`);
    }
    return true;
  }

  async function clearUserRecords(table, description) {
    const { client, user } = await getContext();
    if (!user) return null;
    const { error } = await client
      .from(table)
      .delete()
      .eq("auth_user_id", user.id);
    if (error) {
      throw new Error(`Could not clear ${description}: ${error.message}`);
    }
    return user.id;
  }

  window.userDataStore = {
    async getCurrentUser() {
      const { user } = await getContext();
      return user;
    },

    async loadSettings() {
      const { user } = await getContext();
      return user
        ? { user, settings: user.user_metadata || {} }
        : { user: null, settings: {} };
    },

    async saveSettings(updates) {
      const { client, user } = await getContext();
      if (!user) return false;

      const { data, error } = await client.auth.updateUser({
        data: { ...(user.user_metadata || {}), ...updates }
      });
      if (error) {
        throw new Error(`Could not save account settings: ${error.message}`);
      }
      return data.user;
    },

    async saveReadingHistoryRecord(record) {
      const { client, user } = await getContext();
      if (!user || record.userId !== user.id) return false;
      await saveRecords(client, [record], user.id);
      return true;
    },

    async loadReadingHistory(localRecords) {
      const { client, user } = await getContext();
      if (!user) {
        return {
          user: null,
          records: (Array.isArray(localRecords) ? localRecords : []).filter(function (record) {
            return !record.userId;
          })
        };
      }

      const accountRecords = (Array.isArray(localRecords) ? localRecords : []).filter(function (record) {
        return record.userId === user.id;
      });
      await saveRecords(client, accountRecords, user.id);

      const records = [];
      const pageSize = 1000;
      for (let start = 0; ; start += pageSize) {
        const { data, error } = await client
          .from(HISTORY_TABLE)
          .select("user_id,session_id,type,title,manga_id,chapter,page_number,total_pages,duration_seconds,read_at")
          .eq("user_id", user.id)
          .order("read_at", { ascending: false })
          .order("id", { ascending: false })
          .range(start, start + pageSize - 1);
        if (error) {
          throw new Error(`Could not load reading history: ${error.message}`);
        }
        records.push(...data.map(fromDatabaseRecord));
        if (data.length < pageSize) break;
      }
      return { user, records };
    },

    async importLocalReadingHistory(localRecords) {
      const { client, user } = await getContext();
      if (!user) {
        throw new Error("Sign in before importing local reading history.");
      }

      const ownedRecords = (Array.isArray(localRecords) ? localRecords : [])
        .filter(function (record) { return !record.userId || record.userId === user.id; })
        .map(function (record) { return { ...record, userId: user.id }; });
      await saveRecords(client, ownedRecords, user.id);
      return this.loadReadingHistory(ownedRecords);
    },

    async deleteReadingHistoryRecord(sessionId) {
      const { client, user } = await getContext();
      if (!user) return false;
      const { error } = await client
        .from(HISTORY_TABLE)
        .delete()
        .eq("user_id", user.id)
        .eq("session_id", sessionId);
      if (error) {
        throw new Error(`Could not delete reading history: ${error.message}`);
      }
      return true;
    },

    async clearReadingHistory() {
      const { client, user } = await getContext();
      if (!user) return null;
      const { error } = await client
        .from(HISTORY_TABLE)
        .delete()
        .eq("user_id", user.id);
      if (error) {
        throw new Error(`Could not clear reading history: ${error.message}`);
      }
      return user.id;
    },

    async loadFavorites(localRecords) {
      return loadUserRecords({
        localRecords: localRecords,
        migrationKey: "supabaseFavoritesImported",
        ownerKey: "supabaseFavoritesOwner",
        keyForRecord: favoriteKey,
        toRow: toFavoriteRow,
        fromRow: fromFavoriteRow,
        table: FAVORITES_TABLE,
        columns: "favorite_id,auth_user_id,manga_id,title,href,image,note,category,type,created_at",
        conflictColumns: "auth_user_id,manga_id",
        orderColumn: "favorite_id",
        description: "favorites",
        localStorageKey: FAVORITES_KEY
      });
    },

    async saveFavorite(record) {
      return saveUserRecord({
        record: record,
        toRow: toFavoriteRow,
        table: FAVORITES_TABLE,
        conflictColumns: "auth_user_id,manga_id",
        description: "favorite"
      });
    },

    async deleteFavorite(mangaId) {
      return deleteUserRecord({
        table: FAVORITES_TABLE,
        description: "favorite",
        matchColumns: [{ column: "manga_id", value: String(mangaId) }]
      });
    },

    async clearFavorites() {
      return clearUserRecords(FAVORITES_TABLE, "favorites");
    },

    async loadSavedVocab(localRecords) {
      return loadUserRecords({
        localRecords: localRecords,
        migrationKey: "supabaseSavedVocabImported",
        ownerKey: "supabaseSavedVocabOwner",
        keyForRecord: vocabKey,
        toRow: toVocabRow,
        fromRow: fromVocabRow,
        table: VOCAB_TABLE,
        columns: "saved_vocab_id,auth_user_id,word,level,reading,meaning,meaning_th,created_at",
        conflictColumns: "auth_user_id,word,level",
        orderColumn: "saved_vocab_id",
        description: "saved vocabulary",
        localStorageKey: VOCAB_KEY
      });
    },

    async saveSavedVocab(record) {
      return saveUserRecord({
        record: record,
        toRow: toVocabRow,
        table: VOCAB_TABLE,
        conflictColumns: "auth_user_id,word,level",
        description: "saved vocabulary"
      });
    },

    async deleteSavedVocab(record) {
      return deleteUserRecord({
        table: VOCAB_TABLE,
        description: "saved vocabulary",
        matchColumns: [
          { column: "word", value: String(record.word || "") },
          { column: "level", value: String(record.level || "") }
        ]
      });
    },

    async clearSavedVocab() {
      return clearUserRecords(VOCAB_TABLE, "saved vocabulary");
    }
  };
})();
