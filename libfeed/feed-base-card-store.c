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

#include "feed-base-card-store.h"

G_DEFINE_INTERFACE (EosDiscoveryFeedBaseCardStore,
                    eos_discovery_feed_base_card_store,
                    G_TYPE_OBJECT)

static void
eos_discovery_feed_base_card_store_init (EosDiscoveryFeedBaseCardStore *store)
{
}

static void
eos_discovery_feed_base_card_store_default_init (EosDiscoveryFeedBaseCardStoreInterface *iface)
{
  g_object_interface_install_property (iface,
                                       g_param_spec_uint ("type",
                                                          "Card Type",
                                                          "The type of card",
                                                          EOS_DISCOVERY_FEED_CARD_STORE_TYPE_UNSET,
                                                          EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD,
                                                          EOS_DISCOVERY_FEED_CARD_STORE_TYPE_UNSET,
                                                          G_PARAM_READABLE));
}
