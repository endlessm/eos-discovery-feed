#                                               -*- Autoconf -*-
# Process this file with autoconf to produce a configure script.

AC_PREREQ([2.69])
AC_INIT([com.endlessm.DiscoveryFeed],
        [0.0.0],
        [bugs@endlessm.com],
        [com.endlessm.DiscoveryFeed],
        [http://www.endlessm.com])
AM_INIT_AUTOMAKE([1.12 dist-xz no-dist-gzip foreign tar-ustar parallel-tests subdir-objects no-define -Wno-portability])
AM_SILENT_RULES([yes])

# Custom macros
AC_CONFIG_MACRO_DIRS([m4])

# Gettext package name
GETTEXT_PACKAGE=$PACKAGE_NAME
AC_SUBST(GETTEXT_PACKAGE)
IT_PROG_INTLTOOL([0.35.0])
AC_PROG_LN_S

# Set up libtool
LT_INIT

# GSettings schema
GLIB_GSETTINGS

# Set up GObject-Introspection
GOBJECT_INTROSPECTION_CHECK([1.30.0])

# Checks for programs.
AC_PROG_AWK  # needed for TAP driver
AC_PROG_SED  # needed for finding files for coverage
AC_REQUIRE_AUX_FILE([tap-driver.sh])
AC_PATH_PROG([GLIB_MKENUMS], [glib-mkenums], [notfound])
AS_IF([test x$GLIB_MKENUMS = xnotfound], [AC_MSG_ERROR([glib-mkenums not found.
Try installing the glib development package.])])

# Checks for programs.
GLIB_COMPILE_RESOURCES=`$PKG_CONFIG --variable glib_compile_resources gio-2.0`
AC_PATH_PROG([GJS],[gjs])

# Checks for libraries.
PKG_CHECK_MODULES(EOS_DISCOVERY_FEED, [contentfeed-0 eos-shard-0 glib-2.0 gio-2.0 gobject-2.0 gio-unix-2.0 gtk+-3.0 libsoup-2.4])

# Checks for header files.

# Checks for typedefs, structures, and compiler characteristics.

# Checks for library functions.

# JASMINE_JUNIT_REPORTS_DIR: Where to put test reports
AC_MSG_CHECKING([where to put test reports])
AC_ARG_VAR([JASMINE_JUNIT_REPORTS_DIR], [Where to put test reports])
AS_IF([test -n "$JASMINE_JUNIT_REPORTS_DIR"],
    [JASMINE_REPORT_ARGUMENT="--junit $JASMINE_JUNIT_REPORTS_DIR/\$\${log/%.log/.js.xml}"
    AC_MSG_RESULT([in $JASMINE_JUNIT_REPORTS_DIR])],
    [JASMINE_REPORT_ARGUMENT=
    AC_MSG_RESULT([nowhere])])
AC_SUBST([JASMINE_REPORT_ARGUMENT])

# Code Coverage
# -------------
EOS_COVERAGE_REPORT([js])

# Linting
# -------
EOS_ESLINT

# Substitute variables
AC_SUBST(GLIB_COMPILE_RESOURCES)

AC_CONFIG_FILES([
    Makefile
    po/Makefile.in
])

AC_OUTPUT

