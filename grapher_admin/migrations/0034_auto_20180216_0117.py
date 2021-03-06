# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-02-16 01:17
from __future__ import unicode_literals
from django.db import migrations, models, transaction, connection


def execute(apps, schema_editor):
    Variable = apps.get_model('grapher_admin', 'Variable')
    with transaction.atomic():
        for v in Variable.objects.all():
            if v.displayName:
                v.display['name'] = v.displayName
            if v.displayUnit:
                v.display['unit'] = v.displayUnit
            if v.displayShortUnit:
                v.display['shortUnit'] = v.displayShortUnit
            if v.displayUnitConversionFactor != None:
                v.display['conversionFactor'] = v.displayUnitConversionFactor
            if v.displayIsProjection:
                v.display['isProjection'] = v.displayIsProjection
            if v.displayTolerance != None:
                v.display['tolerance'] = v.displayTolerance
            if v.displayNumDecimalPlaces != None:
                v.display['numDecimalPlaces'] = v.displayNumDecimalPlaces
            v.save()


class Migration(migrations.Migration):

    dependencies = [
        ('grapher_admin', '0033_variable_display'),
    ]

    operations = [
        migrations.RunPython(execute),
    ]
