/* Copyright 2018 Endless Mobile, Inc.
 *
 * eos-discovery-feed is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 2.1 of the
 * License, or (at your option) any later version.
 *
 * eos-discovery-feed is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with eos-discovery-feed.  If not, see
 * <http://www.gnu.org/licenses/>.
 */

#include <gio/gdesktopappinfo.h>
#include <gio/gio.h>

#include "feed-provider-lookup.h"
#include "feed-provider-info.h"

static GStrv
determine_flatpak_system_dirs (void)
{
  static const gchar *default_system_dirs[] = {
    "/var/lib/flatpak",
    "/var/endless-extra/flatpak",
    NULL
  };
  const gchar *flatpak_system_dirs_env = g_getenv ("EOS_DISCOVERY_FEED_FLATPAK_SYSTEM_DIRS");

  if (flatpak_system_dirs_env != NULL)
    return g_strsplit (flatpak_system_dirs_env, ":", -1);

  return g_strdupv ((GStrv) default_system_dirs);
}

/* XXX: I am not sure if this maintains the insert-order */
static void
consume_strv_into_hashset (const gchar * const *strv,
                           GHashTable          *set)
{
  const gchar * const *iter = strv;

  for (; *iter != NULL; ++iter)
    g_hash_table_insert (set, g_strdup (*iter), NULL);
}

static GStrv
hashset_to_strv (GHashTable *set)
{
  GHashTableIter iter;
  GPtrArray *all_data_dirs = g_ptr_array_new_full (g_hash_table_size (set),
                                                   g_free);
  gchar *key;

  g_hash_table_iter_init (&iter, set);
  while (g_hash_table_iter_next (&iter, (gpointer*) &key, NULL))
    g_ptr_array_add (all_data_dirs, g_strdup (key));

  g_ptr_array_add (all_data_dirs, NULL);
  return (GStrv) g_ptr_array_free (all_data_dirs, FALSE);
}

static GStrv
append_suffix_to_each_path (const gchar * const *paths,
                            const gchar         *suffix)
{
  GPtrArray *array = g_ptr_array_new_with_free_func (g_free);
  const gchar * const *iter = paths;

  for (; *iter != NULL; ++iter)
    g_ptr_array_add (array, g_build_filename (*iter, suffix, NULL));

  g_ptr_array_add (array, NULL);
  return (GStrv) g_ptr_array_free (array, FALSE);
}

static GStrv
all_relevant_data_dirs (void)
{
  g_autoptr(GHashTable) set = g_hash_table_new_full (g_str_hash,
                                                     g_str_equal,
                                                     g_free,
                                                     NULL);
  const gchar * const *system_data_dirs = g_get_system_data_dirs ();
  g_auto(GStrv) flatpak_system_dirs = determine_flatpak_system_dirs ();
  g_auto(GStrv) flatpak_exports_dirs = append_suffix_to_each_path ((const gchar * const *) flatpak_system_dirs,
                                                                   "exports/share");

  consume_strv_into_hashset ((const gchar * const *) system_data_dirs, set);
  consume_strv_into_hashset ((const gchar * const *) flatpak_exports_dirs, set);

  g_hash_table_insert (set, g_strdup ("/run/host/usr/share"), NULL);

  return hashset_to_strv (set);
}

#define DISCOVERY_FEED_SECTION_NAME "Discovery Feed Content Provider"
#define LOAD_ITEM_SECTION_NAME "Load Item Provider"

static const gchar * const required_discovery_feed_provider_keys[] = {
  "DesktopId",
  "ObjectPath",
  "BusName",
  "SupportedInterfaces",
  NULL
};

static gboolean
key_file_has_specified_keys_in_section (GKeyFile             *key_file,
                                        const gchar          *path,
                                        const gchar          *section,
                                        const gchar * const  *keys,
                                        gboolean             *out_has_keys,
                                        GError              **error)
{
  g_autoptr(GError) local_error = NULL;
  const gchar * const *iter = keys;

  g_return_val_if_fail (out_has_keys != NULL, FALSE);

  for (; *iter != NULL; ++iter)
    {
      gboolean has_key = g_key_file_has_key (key_file, section, *iter, &local_error);

      /* Documentation says that g_key_file_has_key does not follow
       * GError rules exactly - the return value has meaning and we must
       * check the GError outparam ourselves. */
      if (local_error != NULL)
        {
          g_propagate_error (error, g_steal_pointer (&local_error));
          return FALSE;
        }

      if (!has_key)
        {
          g_message ("Key file %s does not have key %s in section %s (ignoring)",
                     path,
                     *iter,
                     section);
          *out_has_keys = FALSE;
          return TRUE;
        }
    }

  *out_has_keys = TRUE;
  return TRUE;
}

/* This function only has an awkward outparam because NULL
 * permissible for default_value, which has a different meaning
 * from a NULL return from g_key_file_get_string */
static gboolean
optional_get_key_file_string (GKeyFile     *key_file,
                              const gchar  *section,
                              const gchar  *key,
                              const gchar  *default_value,
                              gchar       **value_out,
                              GError      **error)
{
  g_autofree gchar *value = NULL;
  g_autoptr(GError) local_error = NULL;

  value = g_key_file_get_string (key_file, section, key, &local_error);

  if (local_error != NULL)
    {
      if (g_error_matches (local_error, G_KEY_FILE_ERROR, G_KEY_FILE_ERROR_KEY_NOT_FOUND))
        {
          *value_out = g_strdup (default_value);
          return TRUE;
        }

      g_propagate_error (error, g_steal_pointer (&local_error));
      return FALSE;
    }

  *value_out = g_steal_pointer (&value);
  return TRUE;
}

/**
 * flatpak_compatible_desktop_app_info:
 * @desktop_id: The Desktop ID to create a GDesktopAppInfo for.
 *
 * Build a GDesktopAppInfo for a .desktop file that might be in the exports
 * directory but is not necessarily executable because the binary was
 * not mounted in the bwrap jail.
 */
static GDesktopAppInfo *
flatpak_compatible_desktop_app_info (const gchar  *desktop_id,
                                     GError      **error)
{
  g_auto(GStrv) data_dirs = all_relevant_data_dirs ();
  GStrv iter = data_dirs;

  for (; *iter != NULL; ++iter)
    {
      g_autofree gchar *path = g_build_filename (*iter,
                                                 "applications",
                                                 desktop_id,
                                                 NULL);
      g_autoptr(GKeyFile) key_file = g_key_file_new ();
      g_autoptr(GError) local_error = NULL;
      g_autoptr(GDesktopAppInfo) info = NULL;

      if (!g_key_file_load_from_file (key_file,
                                      path,
                                      G_KEY_FILE_NONE,
                                      &local_error))
        {
          if (!g_error_matches (local_error,
                                G_FILE_ERROR,
                                G_FILE_ERROR_NOENT))
            {
              g_propagate_error (error, g_steal_pointer (&local_error));
              return NULL;
            }

          continue;
        }

      /* Now that we have the keyfile, set the Exec line to some well-known
       * binary so that GDesktopAppInfo doesn't trip up when we
       * try to read it */
      g_key_file_set_string (key_file,
                             G_KEY_FILE_DESKTOP_GROUP,
                             G_KEY_FILE_DESKTOP_KEY_EXEC,
                             "/bin/true");

      return g_desktop_app_info_new_from_keyfile (key_file);
    }

  g_set_error (error,
               G_IO_ERROR,
               G_IO_ERROR_NOT_FOUND,
               "Desktop file was not found for %s",
               desktop_id);
  return NULL;
}

static gboolean
app_language (const gchar  *desktop_id,
              gchar       **out_language,
              GError      **error)
{
  g_autoptr(GDesktopAppInfo) app_info =  NULL;

  g_return_val_if_fail (out_language != NULL, FALSE);

  app_info = flatpak_compatible_desktop_app_info (desktop_id, error);

  if (app_info == NULL)
    return FALSE;

  *out_language = g_desktop_app_info_get_string (app_info,
                                                 "X-Endless-Content-Language");
  return TRUE;
}

/**
 * lanugage_code_is_compatible:
 * @language: The language code to check.
 * @languages: The supported user languages.
 *
 * True if the provided language code is compatible with the provided
 * languages. We check both the locale variant and the actual language
 * code itself.
 *
 * Returns: %TRUE if the language is supported.
 */
static gboolean
language_code_is_compatible (const gchar         *language,
                             const gchar * const *supported_languages)
{
  g_auto(GStrv) split_language_parts = g_strsplit (language, "_", -1);
  const gchar * const *iter = supported_languages;
  const gchar *language_code = split_language_parts[0];

  return g_strv_contains (supported_languages, language_code);
}

static gboolean
append_providers_in_directory_to_ptr_array (GFile                *directory,
                                            const gchar * const  *languages,
                                            GPtrArray            *providers,
                                            GCancellable         *cancellable,
                                            GError              **error)
{
  g_autoptr(GError) local_error = NULL;
  g_autoptr(GFileEnumerator) enumerator = g_file_enumerate_children (directory,
                                                                     "standard::name,standard::type",
                                                                     G_FILE_QUERY_INFO_NONE,
                                                                     cancellable,
                                                                     &local_error);
  GFileInfo *info;
  GFile *child;

  if (enumerator == NULL)
    {
      /* Okay, just means this directory didn't exist */
      if (g_error_matches (local_error, G_IO_ERROR, G_IO_ERROR_NOT_FOUND))
        return TRUE;

      g_propagate_error (error, g_steal_pointer (&local_error));
      return FALSE;
    }

  while (g_file_enumerator_iterate (enumerator, &info, &child, cancellable, error))
    {
      gboolean has_required_discovery_feed_provider_keys = FALSE;
      g_autofree gchar *provider_file_path = NULL;
      g_autofree gchar *knowledge_app_id = NULL;
      g_autofree gchar *knowledge_search_object_path = NULL;
      g_autofree gchar *desktop_id = NULL;
      g_autofree gchar *provider_object_path = NULL;
      g_autofree gchar *provider_bus_name = NULL;
      g_autofree gchar *provider_supported_interfaces_str = NULL;
      g_auto(GStrv) provider_supported_interfaces = NULL;
      g_autoptr(GFile) candidate_provider_file = NULL;
      g_autoptr(GKeyFile) key_file = NULL;
      g_autoptr(GError) enumerate_provider_error = NULL;

      if (child == NULL || info == NULL)
        break;

      candidate_provider_file = g_file_get_child (directory,
                                                  g_file_info_get_name (info));
      provider_file_path = g_file_get_path (candidate_provider_file);
      key_file = g_key_file_new ();

      if (!g_key_file_load_from_file (key_file,
                                      provider_file_path,
                                      G_KEY_FILE_NONE,
                                      &enumerate_provider_error))
        {
          g_message ("Key file %s could not be loaded: %s (ignoring)",
                     provider_file_path,
                     enumerate_provider_error->message);
          continue;
        }

      if (!g_key_file_has_group (key_file, DISCOVERY_FEED_SECTION_NAME))
        {
          g_message ("Key file %s does not have a section called %s (ignoring)",
                     provider_file_path,
                     DISCOVERY_FEED_SECTION_NAME);
          continue;
        }

      if (!g_key_file_has_group (key_file, DISCOVERY_FEED_SECTION_NAME))
        {
          g_message ("Key file %s does not have a section called %s (ignoring)",
                     provider_file_path,
                     DISCOVERY_FEED_SECTION_NAME);
          continue;
        }

      if (!key_file_has_specified_keys_in_section (key_file,
                                                   provider_file_path,
                                                   DISCOVERY_FEED_SECTION_NAME,
                                                   required_discovery_feed_provider_keys,
                                                   &has_required_discovery_feed_provider_keys,
                                                   error))
        return FALSE;

      if (!has_required_discovery_feed_provider_keys)
        continue;

      if (g_key_file_has_group (key_file, LOAD_ITEM_SECTION_NAME))
        {
          knowledge_search_object_path = g_key_file_get_string (key_file,
                                                                LOAD_ITEM_SECTION_NAME,
                                                                "ObjectPath",
                                                                NULL);

          if (knowledge_search_object_path == NULL)
            {
              g_message ("Key file %s does not have key 'ObjectPath' in %s (ignoring)",
                         provider_file_path,
                         LOAD_ITEM_SECTION_NAME);
              continue;
            }
        }

      if (!optional_get_key_file_string (key_file,
                                         DISCOVERY_FEED_SECTION_NAME,
                                         "DesktopId",
                                         NULL,
                                         &desktop_id,
                                         error))
        return FALSE;

      /* Now, if we have a Desktop ID, we'll want to check it to see if there's
       * an embedded language code in the desktop file. If so, filter out this
       * application if it would not be compatible. */
      if (desktop_id != NULL)
        {
          g_autofree gchar *provider_locale = NULL;

          if (!app_language (desktop_id, &provider_locale, error))
            return FALSE;

          if (provider_locale != NULL &&
              !language_code_is_compatible (provider_locale, languages))
            {
              g_autofree gchar *language_codes_joined = g_strjoinv (", ", (GStrv) languages);
              g_message ("Language code %s in provider %s is not compatible "
                         "with language codes %s (ignoring)",
                         provider_locale,
                         provider_file_path,
                         language_codes_joined);
              continue;  
            }
        }

      /* We checked for the presence of all these keys earlier, so we only
       * assert that g_key_file_get_string succeeded */
      provider_object_path = g_key_file_get_string (key_file,
                                                    DISCOVERY_FEED_SECTION_NAME,
                                                    "ObjectPath",
                                                    NULL);
      g_assert (provider_object_path != NULL);

      provider_bus_name = g_key_file_get_string (key_file,
                                                 DISCOVERY_FEED_SECTION_NAME,
                                                 "BusName",
                                                 NULL);
      g_assert (provider_bus_name != NULL);

      provider_supported_interfaces_str = g_key_file_get_string (key_file,
                                                                 DISCOVERY_FEED_SECTION_NAME,
                                                                 "SupportedInterfaces",
                                                                 NULL);
      g_assert (provider_supported_interfaces_str);

      provider_supported_interfaces = g_strsplit (provider_supported_interfaces_str, ";", -1);

      if (!optional_get_key_file_string (key_file,
                                         DISCOVERY_FEED_SECTION_NAME,
                                         "AppID",
                                         NULL,
                                         &knowledge_app_id,
                                         error))
        return FALSE;     

      g_ptr_array_add (providers,
                       eos_discovery_feed_provider_info_new (provider_object_path,
                                                             provider_bus_name,
                                                             (const gchar * const *) provider_supported_interfaces,
                                                             knowledge_app_id,
                                                             desktop_id,
                                                             knowledge_search_object_path));
    }

  return TRUE;
}

static GStrv
supported_languages (void)
{
  g_autoptr(GSettings) settings = g_settings_new ("com.endlessm.DiscoveryFeed");
  GPtrArray *languages = g_ptr_array_new ();
  const gchar * const *system_languages = g_get_language_names ();
  g_auto(GStrv) force_additional_languages = g_settings_get_strv (settings,
                                                                  "force-additional-languages");
  const gchar * const *iter = NULL;

  for (iter = system_languages; *iter != NULL; ++iter)
    g_ptr_array_add (languages, g_strdup (*iter));

  for (iter = (const gchar * const *) force_additional_languages; *iter != NULL; ++iter)
    g_ptr_array_add (languages, g_strdup (*iter));

  g_ptr_array_add (languages, g_strdup ("*"));
  g_ptr_array_add (languages, NULL);

  return (GStrv) g_ptr_array_free (languages, FALSE);
}

static GPtrArray *
lookup_providers (GCancellable  *cancellable,
                  GError       **error)
{
  g_auto(GStrv) data_directories = all_relevant_data_dirs ();
  g_autoptr(GPtrArray) providers = g_ptr_array_new_with_free_func (g_object_unref);
  GStrv iter = data_directories;

  for (; *iter != NULL; ++iter)
    {
      g_autofree gchar *path = g_build_filename (*iter,
                                                 "eos-discovery-feed",
                                                 "content-providers",
                                                 NULL);
      g_auto(GStrv) languages = supported_languages ();
      g_autoptr(GFile) directory = g_file_new_for_path (path);

      if (!append_providers_in_directory_to_ptr_array (directory,
                                                       (const gchar * const *) languages,
                                                       providers,
                                                       cancellable,
                                                       error))
        return NULL;
    }

  return g_steal_pointer (&providers);
}

static void
lookup_providers_thread (GTask        *task,
                         gpointer      source,
                         gpointer      task_data,
                         GCancellable *cancellable)
{
  g_autoptr(GError) local_error = NULL;
  g_autoptr(GPtrArray) array = lookup_providers (cancellable, &local_error);

  if (array == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  g_task_return_pointer (task,
                         g_steal_pointer (&array),
                         (GDestroyNotify) g_ptr_array_unref);
}
            

/**
 * eos_discovery_feed_find_providers_finish:
 * @result: A #GAsyncResult
 * @error: A #GError
 *
 * Complete a call to eos_discovery_feed_find_providers.
 *
 * XXX: It also seems that like pygi, using transfer full here causes
 * a double-free. Using transfer-none for now.
 *
 * Returns: (transfer none) (element-type EosDiscoveryFeedProviderInfo): A
 * #GPtrArray of #EosDiscoveryFeedProviderInfo with information about each
 * provider file, or %NULL on error.
 */
GPtrArray *
eos_discovery_feed_find_providers_finish (GAsyncResult  *result,
                                          GError       **error)
{
  GTask *task = G_TASK (result);
  return g_task_propagate_pointer (task, error);
}

/**
 * eos_discovery_feed_find_providers:
 * @cancellable: A #GCancellable
 * @callback: (scope async): Callback function
 * @user_data: Closure for @callback
 *
 * Lookup all provider files on the filesystem and return a #GPtrArray
 * to the GAsyncReadyCallback provided. Use eos_discovery_feed_find_providers
 * to complete the call.
 */
void
eos_discovery_feed_find_providers (GCancellable        *cancellable,
                                   GAsyncReadyCallback  callback,
                                   gpointer             user_data)
{
  g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);

  g_task_set_return_on_cancel (task, TRUE);
  g_task_set_task_data (task,
                        NULL,
                        NULL);
  g_task_run_in_thread (task, lookup_providers_thread);
}

