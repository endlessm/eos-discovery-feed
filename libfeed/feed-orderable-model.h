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

#pragma once

#include <feed-base-card-store.h>
#include <glib-object.h>

G_BEGIN_DECLS

#define EOS_DISCOVERY_FEED_TYPE_ORDERABLE_MODEL eos_discovery_feed_orderable_model_get_type ()
G_DECLARE_FINAL_TYPE (EosDiscoveryFeedOrderableModel, eos_discovery_feed_orderable_model, EOS_DISCOVERY_FEED, ORDERABLE_MODEL, GObject)

const gchar * eos_discovery_feed_orderable_model_get_source (EosDiscoveryFeedOrderableModel *model);
EosDiscoveryFeedCardStoreType eos_discovery_feed_orderable_model_get_card_store_type (EosDiscoveryFeedOrderableModel *model);
EosDiscoveryFeedBaseCardStore * eos_discovery_feed_orderable_model_get_model (EosDiscoveryFeedOrderableModel *model);

EosDiscoveryFeedOrderableModel * eos_discovery_feed_orderable_model_new (EosDiscoveryFeedBaseCardStore *model,
                                                                         EosDiscoveryFeedCardStoreType  type,
                                                                         const char                    *source);

G_END_DECLS
