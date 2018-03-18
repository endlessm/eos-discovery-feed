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

#include <glib-object.h>

G_BEGIN_DECLS

typedef enum
{
  EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_UNSET = 0,
  EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_FIRST,
  EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_LAST,
  EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_N_DIRECTIONS
} EosDiscoveryFeedCardLayoutDirection;

G_END_DECLS
