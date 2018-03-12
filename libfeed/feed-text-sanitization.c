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

#include <string.h>

#include <glib.h>

#include "feed-text-sanitization.h"

#include "config.h"

static gchar *
regex_replace (const gchar *exp, const gchar *str, const gchar *replacement)
{
  g_autoptr(GError) error = NULL;
  g_autoptr(GRegex) regex = g_regex_new (exp, 0, 0, &error);
  g_autofree gchar *replaced = NULL;

  if (regex == NULL)
    {
      g_error ("Fatal error in compiling regular expression: %s", error->message);
      return NULL;
    }

  replaced = g_regex_replace (regex, str, -1, 0, replacement, 0, &error);

  if (replaced == NULL)
    {
      g_error ("Fatal error in performing string replacement: %s", error->message);
      return NULL;
    }

  return g_steal_pointer (&replaced);
}

static gchar *
remove_square_brackets (const gchar *str)
{
  return regex_replace ("\\[\\d+\\]", str, "");
}

static gchar *
remove_parens (const gchar *str)
{
  return regex_replace ("\\(.*?\\)", str, "");
}

static gchar *
trim_to_first_two_sentences (const gchar *str)
{
  g_autoptr(GPtrArray) sentences = g_ptr_array_new ();
  g_auto(GStrv) all_sentences = g_strsplit (str, ".", -1);
  GStrv iter = all_sentences;
  guint sentence_count = 0;

  for (; *iter != NULL && sentence_count < 2; ++iter)
    {
      if (strlen (*iter) > 0)
        g_ptr_array_add (sentences, *iter);
        ++sentence_count;
    }

  /* Null-terminate */
  g_ptr_array_add (sentences, NULL);
  return g_strjoinv (".", (GStrv) sentences->pdata);
}

static gchar *
normalize_whitespace (const gchar *str)
{
  return regex_replace ("\\s+", str, " ");
}

static gchar *
strip (const gchar *str)
{
  gchar *copy = g_strdup (str);
  g_strstrip (copy);
  return copy;
}

static gchar *
add_ending_period (const gchar *str)
{
  guint len = strlen (str);
  g_autofree gchar *ending_period = g_new0 (gchar, len + 2);

  strcpy (ending_period, str);
  ending_period[len] = '.';
  ending_period[len + 1] = '\0';

  return g_steal_pointer (&ending_period);
}

gchar *
eos_discovery_feed_sanitize_synopsis (const gchar *synopsis)
{
  g_autofree gchar *stripped = strip (synopsis);
  g_autofree gchar *square_brackets_removed = remove_square_brackets (stripped);
  g_autofree gchar *parens_removed = remove_parens (square_brackets_removed);
  g_autofree gchar *first_two_sentences = trim_to_first_two_sentences (parens_removed);
  g_autofree gchar *normalized_whitespace = normalize_whitespace (first_two_sentences);
  g_autofree gchar *with_ending_period = add_ending_period (normalized_whitespace);

  return g_steal_pointer (&with_ending_period);
}
