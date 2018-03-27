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

#include "feed-app-card-store.h"
#include "feed-base-card-store.h"

struct _EosDiscoveryFeedAppCardStore
{
  GObject parent_instance;
};

typedef struct _EosDiscoveryFeedAppCardStorePrivate
{
  gchar *desktop_id;
} EosDiscoveryFeedAppCardStorePrivate;

G_DEFINE_TYPE_WITH_PRIVATE (EosDiscoveryFeedAppCardStore,
                            eos_discovery_feed_app_card_store,
                            G_TYPE_OBJECT)

enum {
  PROP_0,
  PROP_DESKTOP_ID,
  NPROPS
};

static GParamSpec *eos_discovery_feed_app_card_store_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_app_card_store_set_property (GObject      *object,
                                                guint         prop_id,
                                                const GValue *value,
                                                GParamSpec   *pspec)
{
  EosDiscoveryFeedAppCardStore *store = EOS_DISCOVERY_FEED_APP_CARD_STORE (object);
  EosDiscoveryFeedAppCardStorePrivate *priv = eos_discovery_feed_app_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_DESKTOP_ID:
      priv->desktop_id = g_value_dup_string (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_app_card_store_get_property (GObject    *object,
                                                guint       prop_id,
                                                GValue     *value,
                                                GParamSpec *pspec)
{
  EosDiscoveryFeedAppCardStore *store = EOS_DISCOVERY_FEED_APP_CARD_STORE (object);
  EosDiscoveryFeedAppCardStorePrivate *priv = eos_discovery_feed_app_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_DESKTOP_ID:
      g_value_set_string (value, priv->desktop_id);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_app_card_store_finalize (GObject *object)
{
  EosDiscoveryFeedAppCardStore *store = EOS_DISCOVERY_FEED_APP_CARD_STORE (object);
  EosDiscoveryFeedAppCardStorePrivate *priv = eos_discovery_feed_app_card_store_get_instance_private (store);

  g_clear_pointer (&priv->desktop_id, g_free);

  G_OBJECT_CLASS (eos_discovery_feed_app_card_store_parent_class)->finalize (object);
}

static void
eos_discovery_feed_app_card_store_init (EosDiscoveryFeedAppCardStore *store)
{
}

static void
eos_discovery_feed_app_card_store_class_init (EosDiscoveryFeedAppCardStoreClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_app_card_store_get_property;
  object_class->set_property = eos_discovery_feed_app_card_store_set_property;
  object_class->finalize = eos_discovery_feed_app_card_store_finalize;

  eos_discovery_feed_app_card_store_props[PROP_DESKTOP_ID] =
    g_param_spec_string ("desktop-id",
                         "Desktop ID",
                         "The Desktop ID of the App",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  g_object_class_install_properties (object_class,
                                     NPROPS,
                                     eos_discovery_feed_app_card_store_props);
}

EosDiscoveryFeedAppCardStore *
eos_discovery_feed_app_card_store_new (const gchar *desktop_id)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_APP_CARD_STORE,
                       "desktop-id", desktop_id,
                       NULL);
}
