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

#include "feed-word-card-store.h"

struct _EosDiscoveryFeedWordCardStore
{
  GObject parent_instance;
};

typedef struct _EosDiscoveryFeedWordCardStorePrivate
{
  gchar *word;
  gchar *part_of_speech;
  gchar *definition;
} EosDiscoveryFeedWordCardStorePrivate;

G_DEFINE_TYPE_WITH_PRIVATE (EosDiscoveryFeedWordCardStore,
                            eos_discovery_feed_word_card_store,
                            G_TYPE_OBJECT)

enum {
  PROP_0,
  PROP_WORD,
  PROP_PART_OF_SPEECH,
  PROP_DEFINITION,
  NPROPS
};

static GParamSpec *eos_discovery_feed_word_card_store_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_word_card_store_set_property (GObject      *object,
                                                 guint         prop_id,
                                                 const GValue *value,
                                                 GParamSpec   *pspec)
{
  EosDiscoveryFeedWordCardStore *store = EOS_DISCOVERY_FEED_WORD_CARD_STORE (object);
  EosDiscoveryFeedWordCardStorePrivate *priv = eos_discovery_feed_word_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_WORD:
      priv->word = g_value_dup_string (value);
      break;
    case PROP_PART_OF_SPEECH:
      priv->part_of_speech = g_value_dup_string (value);
      break;
    case PROP_DEFINITION:
      priv->definition = g_value_dup_string (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_word_card_store_get_property (GObject    *object,
                                                 guint       prop_id,
                                                 GValue     *value,
                                                 GParamSpec *pspec)
{
  EosDiscoveryFeedWordCardStore *store = EOS_DISCOVERY_FEED_WORD_CARD_STORE (object);
  EosDiscoveryFeedWordCardStorePrivate *priv = eos_discovery_feed_word_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_WORD:
      g_value_set_string (value, priv->word);
      break;
    case PROP_PART_OF_SPEECH:
      g_value_set_string (value, priv->part_of_speech);
      break;
    case PROP_DEFINITION:
      g_value_set_string (value, priv->definition);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_word_card_store_finalize (GObject *object)
{
  EosDiscoveryFeedWordCardStore *store = EOS_DISCOVERY_FEED_WORD_CARD_STORE (object);
  EosDiscoveryFeedWordCardStorePrivate *priv = eos_discovery_feed_word_card_store_get_instance_private (store);

  g_clear_pointer (&priv->word, g_free);
  g_clear_pointer (&priv->part_of_speech, g_free);
  g_clear_pointer (&priv->definition, g_free);

  G_OBJECT_CLASS (eos_discovery_feed_word_card_store_parent_class)->finalize (object);
}

static void
eos_discovery_feed_word_card_store_init (EosDiscoveryFeedWordCardStore *store)
{
}

static void
eos_discovery_feed_word_card_store_class_init (EosDiscoveryFeedWordCardStoreClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_word_card_store_get_property;
  object_class->set_property = eos_discovery_feed_word_card_store_set_property;
  object_class->finalize = eos_discovery_feed_word_card_store_finalize;

  eos_discovery_feed_word_card_store_props[PROP_WORD] =
    g_param_spec_string ("word",
                         "Word",
                         "The Word of the Day",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);
  eos_discovery_feed_word_card_store_props[PROP_PART_OF_SPEECH] =
    g_param_spec_string ("part-of-speech",
                         "Part of Speech",
                         "The Part of Speech of the Word",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);
  eos_discovery_feed_word_card_store_props[PROP_DEFINITION] =
    g_param_spec_string ("definition",
                         "Definition",
                         "The Definition of the Word",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  g_object_class_install_properties (object_class,
                                     NPROPS,
                                     eos_discovery_feed_word_card_store_props);
}

EosDiscoveryFeedWordCardStore *
eos_discovery_feed_word_card_store_new (const gchar *word,
                                        const gchar *part_of_speech,
                                        const gchar *definition)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_WORD_CARD_STORE,
                       "word", word,
                       "part-of-speech", part_of_speech,
                       "definition", definition,
                       NULL);
}
