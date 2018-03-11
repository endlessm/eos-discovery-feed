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

#include "feed-quote-card-store.h"

struct _EosDiscoveryFeedQuoteCardStore
{
  GObject parent_instance;
};

typedef struct _EosDiscoveryFeedQuoteCardStorePrivate
{
  gchar *quote;
  gchar *author;
} EosDiscoveryFeedQuoteCardStorePrivate;

G_DEFINE_TYPE_WITH_PRIVATE (EosDiscoveryFeedQuoteCardStore,
                            eos_discovery_feed_quote_card_store,
                            G_TYPE_OBJECT)

enum {
  PROP_0,
  PROP_QUOTE,
  PROP_AUTHOR,
  NPROPS
};

static GParamSpec *eos_discovery_feed_quote_card_store_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_quote_card_store_set_property (GObject      *object,
                                                  guint         prop_id,
                                                  const GValue *value,
                                                  GParamSpec   *pspec)
{
  EosDiscoveryFeedQuoteCardStore *store = EOS_DISCOVERY_FEED_QUOTE_CARD_STORE (object);
  EosDiscoveryFeedQuoteCardStorePrivate *priv = eos_discovery_feed_quote_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_QUOTE:
      priv->quote = g_value_dup_string (value);
      break;
    case PROP_AUTHOR:
      priv->author = g_value_dup_string (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_quote_card_store_get_property (GObject    *object,
                                                  guint       prop_id,
                                                  GValue     *value,
                                                  GParamSpec *pspec)
{
  EosDiscoveryFeedQuoteCardStore *store = EOS_DISCOVERY_FEED_QUOTE_CARD_STORE (object);
  EosDiscoveryFeedQuoteCardStorePrivate *priv = eos_discovery_feed_quote_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_QUOTE:
      g_value_set_string (value, priv->quote);
      break;
    case PROP_AUTHOR:
      g_value_set_string (value, priv->author);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_quote_card_store_finalize (GObject *object)
{
  EosDiscoveryFeedQuoteCardStore *store = EOS_DISCOVERY_FEED_QUOTE_CARD_STORE (object);
  EosDiscoveryFeedQuoteCardStorePrivate *priv = eos_discovery_feed_quote_card_store_get_instance_private (store);

  g_clear_pointer (&priv->quote, g_free);
  g_clear_pointer (&priv->author, g_free);

  G_OBJECT_CLASS (eos_discovery_feed_quote_card_store_parent_class)->finalize (object);
}

static void
eos_discovery_feed_quote_card_store_init (EosDiscoveryFeedQuoteCardStore *store)
{
}

static void
eos_discovery_feed_quote_card_store_class_init (EosDiscoveryFeedQuoteCardStoreClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_quote_card_store_get_property;
  object_class->set_property = eos_discovery_feed_quote_card_store_set_property;
  object_class->finalize = eos_discovery_feed_quote_card_store_finalize;

  eos_discovery_feed_quote_card_store_props[PROP_QUOTE] =
    g_param_spec_string ("quote",
                         "Quote",
                         "The Quote of the Day",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);
  eos_discovery_feed_quote_card_store_props[PROP_AUTHOR] =
    g_param_spec_string ("author",
                         "Author",
                         "The author of the quote",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  g_object_class_install_properties (object_class,
                                     NPROPS,
                                     eos_discovery_feed_quote_card_store_props);
}

EosDiscoveryFeedQuoteCardStore *
eos_discovery_feed_quote_card_store_new (const gchar *quote,
                                         const gchar *author)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_QUOTE_CARD_STORE,
                       "quote", quote,
                       "author", author,
                       NULL);
}
